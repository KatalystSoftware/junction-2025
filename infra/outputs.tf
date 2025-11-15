output "db_private_ip" {
  description = "Private IP address of the PostgreSQL instance"
  value       = google_sql_database_instance.app.private_ip_address
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository for application images"
  value       = "${google_artifact_registry_repository.app.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}

output "github_actions_workload_identity_provider" {
  description = "Workload Identity Provider resource name for GitHub Actions OIDC"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_service_account_email" {
  description = "Service account email used by GitHub Actions"
  value       = google_service_account.github_actions.email
}
