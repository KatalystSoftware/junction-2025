variable "project_id" {
  description = "GCP project ID (e.g. junkkari2025)"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run"
  type        = string
  default     = "europe-north1"
}

variable "container_image" {
  description = "Container image to deploy (e.g. ghcr.io/katalystsoftware/financial-advisor-sim:latest)"
  type        = string
  default     = "ghcr.io/katalystsoftware/financial-advisor-sim:latest"
}

variable "google_generative_ai_api_key" {
  description = "API key for Google Generative AI (Gemini)"
  type        = string
  sensitive   = true
}

variable "bastion_zone" {
  description = "GCE zone for bastion host"
  type        = string
  default     = "europe-north1-b"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "appdb"
}

variable "db_user" {
  description = "PostgreSQL database user"
  type        = string
  default     = "appuser"
}
