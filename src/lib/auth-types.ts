export type UserType = "Free" | "Starter" | "Team" | "Growth" | "Enterprise" | "Admin"

export interface UserPublic {
  user_id: string
  email: string
  name: string
  user_type: UserType
  org_id: string
  created_at: string
  updated_at: string | null
}

export interface ApiKey {
  key_id: string
  name: string
  prefix: string
  created_at: string
}

export interface ApiKeyCreated extends ApiKey {
  key: string
}

export interface OrganizationModel {
  org_id: string
  name: string
  user_id: string
  team_ids: string[]
  api_keys: ApiKey[]
  api_key_limit: number
  api_key_usage: number
  plan_tier?: string | null
  created_at: string
  updated_at: string | null
}

export type OrgRole = "owner" | "admin" | "member"

export interface OrgMembership {
  org_id: string
  name: string
  role: OrgRole
  plan: string | null
  member_count: number
  is_current: boolean
  created_at: string
}

export interface OrgMember {
  user_id: string
  name: string
  email: string
  role: OrgRole
  created_at: string
  is_you: boolean
}

export interface OrgInvitation {
  invite_id: string
  email: string
  role: OrgRole
  created_at: string
  expires_at: string
}

export interface InvitePreview {
  valid: boolean
  org_name?: string | null
  email?: string | null
  role?: OrgRole | null
  inviter_name?: string | null
  reason?: string | null
}

export interface AuthSession {
  user: UserPublic
  organization: OrganizationModel
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  refresh_expires_in: number
}

export interface RefreshSession {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  refresh_expires_in: number
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  otp: string
  new_password: string
}

export interface OkResponse {
  ok: boolean
}
