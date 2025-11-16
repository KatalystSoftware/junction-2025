output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "db_private_ip" {
  description = "Private IP address of the PostgreSQL instance"
  value       = google_sql_database_instance.app.private_ip_address
}

output "db_name" {
  description = "PostgreSQL database name"
  value       = var.db_name
}

output "db_user" {
  description = "PostgreSQL database user"
  value       = var.db_user
}

output "database_url" {
  description = "Complete PostgreSQL connection string"
  value = format(
    "postgresql://%s:%s@%s:5432/%s",
    urlencode(var.db_user),
    urlencode(random_password.db_password.result),
    google_sql_database_instance.app.private_ip_address,
    urlencode(var.db_name),
  )
  sensitive = true
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

output "bastion_public_ip" {
  description = "Public IP address of the bastion host"
  value       = google_compute_instance.bastion.network_interface[0].access_config[0].nat_ip
}

output "bastion_zone" {
  description = "GCE zone of the bastion host"
  value       = google_compute_instance.bastion.zone
}
