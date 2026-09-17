# CRM v7 GAS migration and deployment specification

The repository does not contain the deployed Google Apps Script source. CRM v7 therefore treats existing GAS endpoints as compatibility/master-data services only. No deployment was performed from this repository.

## Required server changes

1. Disable customer actions (`get`, `update`, `delete`) for public callers after the local migration window. Do not use Google Sheets as the primary store for Clients, Policies, Benefits, Reviews or ResourceAnswers.
2. Keep product, insurer, official flow and system-setting endpoints read-only for User clients. Require Admin authorization for writes such as `sync_step_data`.
3. The policy extraction endpoint must accept `temporary: true` and return `processingId`. It must delete the uploaded document after extraction and implement `cleanupTemporaryPolicyDocument` as an idempotent operation.
4. Do not log file content, policy numbers, names or extracted financial/insurance data. Define and document provider retention, region and access control before production use.
5. If cross-device Client QR is required, add an authenticated publish/revoke endpoint that accepts only the Level 1/2 read-only snapshot. Return a cryptographically random, expiring bearer token. Never accept predictable client IDs and never return Level 3, notes or full policy numbers.

## Legacy customer migration

On first launch, the browser reads the existing `AVA_CLIENTS_CACHE`, normalizes stable `clientId`, `policyId` and `benefitId` values, and writes records to IndexedDB. The legacy cache remains untouched as a rollback source; all subsequent customer writes are local-only.

Before disabling the legacy customer GAS endpoint, ask each user to open CRM once on their primary device, verify their customers, and export an AVA CRM backup.

## Manual verification before production

- Deploy the revised GAS as a new version; do not overwrite the current deployment without rollback.
- Verify Admin authentication and User read-only master-data access.
- Verify temporary document deletion in provider and Apps Script logs/storage.
- Verify CORS/redirect behavior on iPadOS Safari and Android Chrome.
- If enabling cross-device QR, penetration-test expiry, revocation and cross-client access isolation.
