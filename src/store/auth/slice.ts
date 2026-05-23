import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { ApiError, apiRequest } from "@/lib/api"
import type {
  AuthSession,
  LoginPayload,
  OrganizationModel,
  RefreshSession,
  RegisterPayload,
  UserPublic,
} from "@/lib/auth-types"

const STORAGE_KEY = "fluiq.auth"

export type AuthStatus = "idle" | "loading" | "succeeded" | "failed"

export interface AuthState {
  user: UserPublic | null
  organization: OrganizationModel | null
  accessToken: string | null
  refreshToken: string | null
  status: AuthStatus
  error: string | null
}

interface PersistedAuth {
  user: UserPublic
  organization: OrganizationModel
  accessToken: string
  refreshToken: string
}

function loadPersisted(): PersistedAuth | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedAuth
  } catch {
    return null
  }
}

function persist(state: AuthState): void {
  if (typeof window === "undefined") return
  if (!state.user || !state.organization || !state.accessToken || !state.refreshToken) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  const payload: PersistedAuth = {
    user: state.user,
    organization: state.organization,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

const persisted = loadPersisted()

const initialState: AuthState = {
  user: persisted?.user ?? null,
  organization: persisted?.organization ?? null,
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,
  status: "idle",
  error: null,
}

export const registerThunk = createAsyncThunk<AuthSession, RegisterPayload, { rejectValue: string }>(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest<AuthSession>("/auth/register", { method: "POST", body: payload })
    } catch (err) {
      return rejectWithValue(err instanceof ApiError ? err.detail : "Registration failed")
    }
  },
)

export const loginThunk = createAsyncThunk<AuthSession, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest<AuthSession>("/auth/login", { method: "POST", body: payload })
    } catch (err) {
      return rejectWithValue(err instanceof ApiError ? err.detail : "Login failed")
    }
  },
)

export const refreshThunk = createAsyncThunk<
  RefreshSession,
  void,
  { state: { auth: AuthState }; rejectValue: string }
>("auth/refresh", async (_, { getState, rejectWithValue }) => {
  const { refreshToken } = getState().auth
  if (!refreshToken) return rejectWithValue("No refresh token")
  try {
    return await apiRequest<RefreshSession>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    })
  } catch (err) {
    return rejectWithValue(err instanceof ApiError ? err.detail : "Session expired")
  }
})

export const logoutThunk = createAsyncThunk<void, void, { state: { auth: AuthState } }>(
  "auth/logout",
  async (_, { getState }) => {
    const { refreshToken } = getState().auth
    if (refreshToken) {
      try {
        await apiRequest("/auth/logout", { method: "POST", body: { refresh_token: refreshToken } })
      } catch {
        // Best-effort: still clear local state even if revoke fails.
      }
    }
  },
)

export const deleteAccountThunk = createAsyncThunk<
  void,
  { reason?: string },
  { state: { auth: AuthState }; rejectValue: string }
>(
  "auth/deleteAccount",
  async ({ reason }, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth
    try {
      await apiRequest("/auth/delete-account", {
        method: "DELETE",
        body: { reason: reason ?? null },
        token: accessToken,
      })
    } catch (err) {
      return rejectWithValue(err instanceof ApiError ? err.detail : "Failed to delete account")
    }
  },
)

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
    setTokens(state, action: PayloadAction<RefreshSession>) {
      state.accessToken = action.payload.access_token
      state.refreshToken = action.payload.refresh_token
      persist(state)
    },
    setOrganization(state, action: PayloadAction<OrganizationModel>) {
      state.organization = action.payload
      persist(state)
    },
    setSession(state, action: PayloadAction<AuthSession>) {
      state.user = action.payload.user
      state.organization = action.payload.organization
      state.accessToken = action.payload.access_token
      state.refreshToken = action.payload.refresh_token
      state.status = "succeeded"
      state.error = null
      persist(state)
    },
  },
  extraReducers: (builder) => {
    const handleSession = (state: AuthState, action: PayloadAction<AuthSession>) => {
      state.user = action.payload.user
      state.organization = action.payload.organization
      state.accessToken = action.payload.access_token
      state.refreshToken = action.payload.refresh_token
      state.status = "succeeded"
      state.error = null
      persist(state)
    }
    builder
      .addCase(registerThunk.pending, (state) => { state.status = "loading"; state.error = null })
      .addCase(registerThunk.fulfilled, handleSession)
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? action.error.message ?? "Registration failed"
      })
      .addCase(loginThunk.pending, (state) => { state.status = "loading"; state.error = null })
      .addCase(loginThunk.fulfilled, handleSession)
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? action.error.message ?? "Login failed"
      })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        state.accessToken = action.payload.access_token
        state.refreshToken = action.payload.refresh_token
        persist(state)
      })
      .addCase(refreshThunk.rejected, (state) => {
        state.user = null
        state.organization = null
        state.accessToken = null
        state.refreshToken = null
        state.status = "idle"
        state.error = null
        persist(state)
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.organization = null
        state.accessToken = null
        state.refreshToken = null
        state.status = "idle"
        state.error = null
        persist(state)
      })
      .addCase(deleteAccountThunk.fulfilled, (state) => {
        state.user = null
        state.organization = null
        state.accessToken = null
        state.refreshToken = null
        state.status = "idle"
        state.error = null
        persist(state)
      })
      .addCase(deleteAccountThunk.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to delete account"
      })
  },
})

export const { clearError, setTokens, setOrganization, setSession } = authSlice.actions
export default authSlice.reducer
