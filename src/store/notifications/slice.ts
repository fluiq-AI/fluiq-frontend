import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type NotificationKind =
  | "security"
  | "evals"
  | "prompts"
  | "observability"
  | "api"

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  href: string
  timestamp: string
  read: boolean
}

interface NotificationsState {
  items: AppNotification[]
}

const initialState: NotificationsState = { items: [] }

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    markAllRead(state) {
      state.items.forEach((n) => {
        n.read = true
      })
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.items.find((n) => n.id === action.payload)
      if (n) n.read = true
    },
    addNotification(state, action: PayloadAction<AppNotification>) {
      state.items.unshift(action.payload)
    },
    clearAll(state) {
      state.items = []
    },
  },
})

export const { markAllRead, markRead, addNotification, clearAll } =
  notificationsSlice.actions
export default notificationsSlice.reducer
