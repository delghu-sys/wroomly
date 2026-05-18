export type UserType = 'supplier' | 'consumer' | 'admin'
export type ListingType = 'sublet' | 'swap'
export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'rented' | 'swapped' | 'archived'
export type InquiryStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type TransactionType = 'deposit' | 'first_month' | 'monthly' | 'refund'
export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type ReportTargetType = 'listing' | 'user' | 'message'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'
export type AdminTargetType = 'listing' | 'user' | 'report' | 'transaction'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      listings: {
        Row: Listing
        Insert: Omit<Listing, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Listing, 'id' | 'created_at'>>
      }
      listing_images: {
        Row: ListingImage
        Insert: Omit<ListingImage, 'id' | 'created_at'>
        Update: Partial<Omit<ListingImage, 'id' | 'created_at'>>
      }
      listing_amenities: {
        Row: ListingAmenity
        Insert: Omit<ListingAmenity, 'id'>
        Update: Partial<Omit<ListingAmenity, 'id'>>
      }
      swap_preferences: {
        Row: SwapPreference
        Insert: Omit<SwapPreference, 'id'>
        Update: Partial<Omit<SwapPreference, 'id'>>
      }
      favorites: {
        Row: Favorite
        Insert: Omit<Favorite, 'id' | 'created_at'>
        Update: never
      }
      inquiries: {
        Row: Inquiry
        Insert: Omit<Inquiry, 'id' | 'created_at'>
        Update: Partial<Omit<Inquiry, 'id' | 'created_at'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at'>
        Update: never
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Pick<Message, 'is_read'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at'>
        Update: never
      }
      reports: {
        Row: Report
        Insert: Omit<Report, 'id' | 'created_at'>
        Update: Partial<Pick<Report, 'status'>>
      }
      admin_actions: {
        Row: AdminAction
        Insert: Omit<AdminAction, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export interface User {
  id: string
  email: string
  full_name: string | null
  university: string | null
  user_type: UserType
  avatar_url: string | null
  bio: string | null
  phone: string | null
  instagram_handle: string | null
  stripe_account_id: string | null
  stripe_customer_id: string | null
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  stripe_details_submitted: boolean
  is_verified: boolean
  is_suspended: boolean
  created_at: string
}

export interface UserPhoto {
  id: string
  user_id: string
  storage_path: string
  display_order: number
  created_at: string
}

export interface Listing {
  id: string
  supplier_id: string
  type: ListingType
  title: string
  description: string | null
  address: string | null
  neighborhood: string | null
  lat: number | null
  lng: number | null
  city: string
  state: string
  price_per_month: number | null
  deposit_amount: number | null
  available_from: string
  available_to: string
  bedrooms: number | null
  bathrooms: number | null
  sq_ft: number | null
  furnished: boolean
  pets_allowed: boolean
  utilities_included: boolean
  property_type:
    | 'apartment'
    | 'house'
    | 'condo'
    | 'townhouse'
    | 'duplex'
    | 'studio'
    | 'other'
    | null
  residence_name: string | null
  status: ListingStatus
  auto_review_decision: 'approve' | 'reject' | 'manual' | null
  auto_review_reason: string | null
  auto_review_flags: string[] | null
  auto_reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ListingImage {
  id: string
  listing_id: string
  storage_path: string
  display_order: number
  created_at: string
}

export interface ListingAmenity {
  id: string
  listing_id: string
  amenity: string
}

export interface SwapPreference {
  id: string
  listing_id: string
  preferred_cities: string[]
  preferred_from: string | null
  preferred_to: string | null
  notes: string | null
}

export interface Favorite {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}

export interface Inquiry {
  id: string
  listing_id: string
  consumer_id: string
  message: string
  move_in_date: string | null
  move_out_date: string | null
  status: InquiryStatus
  created_at: string
}

export interface Conversation {
  id: string
  listing_id: string
  supplier_id: string
  consumer_id: string
  inquiry_id: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

export interface Transaction {
  id: string
  listing_id: string
  payer_id: string
  payee_id: string
  type: TransactionType
  amount_cents: number
  platform_fee_cents: number
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  status: TransactionStatus
  release_date: string | null
  created_at: string
}

export interface Review {
  id: string
  listing_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  target_type: ReportTargetType
  target_id: string
  reason: string
  status: ReportStatus
  created_at: string
}

export interface AdminAction {
  id: string
  admin_id: string
  target_type: AdminTargetType
  target_id: string
  action: string
  notes: string | null
  created_at: string
}

// ── Extended types with joins ──────────────────────────────────────────────
export interface ListingWithDetails extends Listing {
  listing_images: ListingImage[]
  listing_amenities: ListingAmenity[]
  swap_preferences: SwapPreference | null
  users: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'university'>
}

export interface ConversationWithDetails extends Conversation {
  listings: Pick<Listing, 'id' | 'title' | 'type'>
  supplier: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  consumer: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  last_message?: Pick<Message, 'content' | 'created_at' | 'sender_id' | 'is_read'>
  unread_count?: number
}
