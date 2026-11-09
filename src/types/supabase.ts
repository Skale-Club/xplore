export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          slug: string
          title: string
          title_i18n: Json
          platform: string
          cover_url: string | null
          created_by: string | null
          created_at: string
          hltb_id: string | null
          hltb_main_hours: number | null
          hltb_main_extra_hours: number | null
          hltb_completionist_hours: number | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          title_i18n?: Json
          platform: string
          cover_url?: string | null
          created_by?: string | null
          created_at?: string
          hltb_id?: string | null
          hltb_main_hours?: number | null
          hltb_main_extra_hours?: number | null
          hltb_completionist_hours?: number | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          title_i18n?: Json
          platform?: string
          cover_url?: string | null
          created_by?: string | null
          created_at?: string
          hltb_id?: string | null
          hltb_main_hours?: number | null
          hltb_main_extra_hours?: number | null
          hltb_completionist_hours?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_categories: {
        Row: {
          id: string
          game_id: string
          key: string | null
          kind: string
          title: string
          title_i18n: Json
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          key?: string | null
          kind?: string
          title: string
          title_i18n?: Json
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          key?: string | null
          kind?: string
          title?: string
          title_i18n?: Json
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_categories_game_id_fkey"
            columns: ["game_id"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      checklist_items: {
        Row: {
          id: string
          category_id: string
          key: string | null
          title: string
          title_i18n: Json
          description: string | null
          description_i18n: Json
          image_url: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          key?: string | null
          title: string
          title_i18n?: Json
          description?: string | null
          description_i18n?: Json
          image_url?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          key?: string | null
          title?: string
          title_i18n?: Json
          description?: string | null
          description_i18n?: Json
          image_url?: string | null
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "checklist_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      user_game_progress: {
        Row: {
          id: string
          user_id: string
          game_id: string
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_progress_game_id_fkey"
            columns: ["game_id"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      user_item_progress: {
        Row: {
          id: string
          user_id: string
          item_id: string
          completed: boolean
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          completed?: boolean
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          completed?: boolean
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_item_progress_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          }
        ]
      }
      trophies: {
        Row: {
          id: string
          game_id: string
          key: string | null
          title: string
          title_i18n: Json
          description: string | null
          description_i18n: Json
          tier: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          key?: string | null
          title: string
          title_i18n?: Json
          description?: string | null
          description_i18n?: Json
          tier?: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          key?: string | null
          title?: string
          title_i18n?: Json
          description?: string | null
          description_i18n?: Json
          tier?: string
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trophies_game_id_fkey"
            columns: ["game_id"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      user_trophy_progress: {
        Row: {
          id: string
          user_id: string
          trophy_id: string
          completed: boolean
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          trophy_id: string
          completed?: boolean
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          trophy_id?: string
          completed?: boolean
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_trophy_progress_trophy_id_fkey"
            columns: ["trophy_id"]
            referencedRelation: "trophies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
