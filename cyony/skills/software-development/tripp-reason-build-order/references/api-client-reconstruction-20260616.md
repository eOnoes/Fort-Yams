# api_client.rs Full Reconstruction — 2026-06-16

## Damage Report

After the secrets cleanup force-push (commit `65476310`), `crates/goose/src/providers/api_client.rs` lost:

| Component | Status | Recovery |
|-----------|--------|----------|
| `AuthProvider` trait | Missing | Reconstructed from `AzureAuthProvider`, `DatabricksAuthProvider`, `ChatGptCodexAuthProvider` impls |
| `OAuthConfig` struct | Missing | Dead-code variant — stubbed with standard OAuth fields |
| `impl ApiClient` block | Entirely missing | All methods reconstructed from provider usage patterns |
| `RequestBuilder` struct + impl | Entirely missing | Reconstructed from test usage |
| `ApiResponse` wrapper | Entirely missing | Inferred from `.payload` and `.status` field access |
| `convert_key_to_pkcs8_pem` | Missing | Reconstructed from test assertions and TlsConfig usage |
| Stray `}` brace | Extra | Removed — was orphaned from a deleted test function |
| `fmt::Display` for `AuthMethod` | Missing | Added |

## Reverse-Engineered API Surface

### AuthProvider trait
```rust
#[async_trait]
pub trait AuthProvider: Send + Sync {
    async fn get_auth_header(&self) -> Result<(String, String)>;
}
```

### OAuthConfig struct
```rust
pub struct OAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub token_url: String,
    pub scopes: Vec<String>,
}
```

### ApiResponse wrapper
```rust
pub struct ApiResponse {
    pub status: StatusCode,
    pub payload: Option<serde_json::Value>,  // JSON-parsed body (not String!)
}
impl ApiResponse {
    pub fn status(&self) -> StatusCode { self.status }
}
```

### ApiClient methods (reconstructed from 21 provider files)
- `new(host, auth) -> Result<Self>` — delegates to `with_timeout` with DEFAULT_PROVIDER_TIMEOUT_SECS
- `with_timeout(host, auth, timeout) -> Result<Self>` — builds reqwest Client with TLS config
- `with_header(self, key, value) -> Result<Self>` — adds default header
- `with_headers(self, headers: HeaderMap) -> Result<Self>` — merges headers
- `with_query(self, params) -> Self` — sets default query params
- `request(&self, session_id, path) -> RequestBuilder` — builds a request with auth + session headers
- `response_get(&self, session_id, path) -> Result<Response>` — direct GET, returns raw reqwest::Response
- `response_post(&self, session_id, path, body) -> Result<Response>` — direct POST, returns raw reqwest::Response
- `api_post(&self, session_id, path, body) -> Result<ApiResponse>` — convenience POST, returns ApiResponse (with parsed JSON payload)

### RequestBuilder methods
- `header(self, key, value) -> Result<Self>` — per-request header
- `response_get(self) -> Result<Response>` — execute GET (returns raw reqwest::Response)
- `response_post<T: Serialize>(self, body) -> Result<Response>` — execute POST with JSON body
- `multipart_post(self, form: multipart::Form) -> Result<Response>` — execute multipart POST
- `send_request<F>(self, f) -> Result<Request>` — test-only: execute arbitrary method via closure

## Build Fixes Applied

1. Stray `}` on line 225 removed
2. `AuthProvider` trait + `OAuthConfig` struct added before `ApiClient`
3. Full `impl ApiClient` + `RequestBuilder` + `ApiResponse` written
4. `convert_key_to_pkcs8_pem` reconstructed with `#[cfg(feature = "native-tls")]` gate
5. Key conversion tests gated behind `#[cfg(feature = "native-tls")]`
6. `impl Debug for ApiClient` added (missing derive caused E0277)
7. `impl fmt::Display for AuthMethod` added

## Feature Gate Map

```
Cargo.toml [features]:
  native-tls = [
    "dep:pem",        → use pem::Pem, pem::parse, Pem::new
    "dep:pkcs1",      → use pkcs1::RsaPrivateKey
    "dep:pkcs8",      → use pkcs8::PrivateKeyInfo, pkcs8::der::Encode
    "dep:sec1",       → use sec1::EcPrivateKey
    "reqwest/native-tls",
    "rmcp/reqwest-native-tls",
    "sqlx/runtime-tokio-native-tls",
    "oauth2/native-tls",
  ]
  rustls-tls = [       ← DEFAULT ENABLED, no system deps
    "reqwest/rustls-tls",
    "rmcp/reqwest-rustls-tls",
  ]
```

When building with `--no-default-features -F "code-mode,rustls-tls"`:
- `native-tls` is OFF → `pem`/`pkcs1`/`pkcs8`/`sec1` not imported
- `convert_key_to_pkcs8_pem` not compiled (gated behind `#[cfg(feature = "native-tls")]`)
- Key conversion tests not compiled (double-gated: `#[cfg(test)]` + `#[cfg(feature = "native-tls")]`)

## Build Command (this VPS)

```bash
cargo build --release --no-default-features -F "code-mode,rustls-tls"
```

## Error Cascade Pattern

The 129 errors on first build were almost all cascading from a few missing definitions:
- Missing `ApiClient::new` caused every provider's constructor to fail
- Missing `RequestBuilder` caused every `.request().response_get()` chain to fail
- Missing `ApiResponse` caused every `response.payload` / `response.status` access to fail

After reconstructing the API client, error count dropped dramatically. Remaining errors were feature-gate issues (optional crate imports) and missing convenience methods.

## Tool Hazards

### read_file 500-line truncation in execute_code
When using `execute_code` to programmatically read and modify files, the `read_file` function defaults to a 500-line limit. If a file exceeds 500 lines:
- The read silently truncates — only first 500 lines returned
- Writing back the truncated content CORRUPTS the file (everything after line 500 is lost)
- The file will have missing closing braces / unterminated blocks
- The build error becomes cryptic (\"unclosed delimiter\") because the problem is structural, not semantic

**Fix**: For files over 500 lines, use `terminal()` with `sed` or `cat` to work with them, or pass explicit `limit` parameter. Never use `execute_code`'s `read_file` + `write_file` for files that might exceed 500 lines without setting `limit` high enough.

### Line-number pollution from read_file output
When `read_file` returns content with line numbers (`NNN|CONTENT`), and you write that directly back via `write_file`, the compiler sees `1|use crate::...` as actual code. Strip prefixes before writing: `sed -i 's/^[[:space:]]*[0-9]*|//' file.rs`
