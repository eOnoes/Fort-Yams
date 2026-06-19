# Recovering Files After Automated Tool Damage

Automated tools (secret scrubbers, formatters, migration scripts) can remove too much — entire function bodies, impl blocks, and trait definitions. This reference covers the reverse-engineering approach to recover.

## Quick Checklist

1. Build the project to get a complete error list
2. Categorize errors: missing types, missing methods, missing functions
3. For each missing item, grep consumers to reverse-engineer the API
4. Reconstruct minimal implementations
5. Gate optional features behind `#[cfg(feature = "...")]`
6. Rebuild and iterate

## Pattern: Reverse-Engineering Missing APIs

When a struct/enum/trait is scrubbed but consumers still reference it:

### Find all consumers
```bash
grep -rn "MissingType\|missing_method" crates/ --include="*.rs"
```

### Reconstruct from call signatures
Read the consumer code to infer:
- Method names and signatures
- Return types (from how results are used)
- Trait bounds (from generic constraints)
- Feature gates (from conditional compilation)

### Example: Reconstructing a provider trait

Consumer code shows:
```rust
impl AuthProvider for AzureAuthProvider {
    async fn get_auth_header(&self) -> Result<(String, String)> { ... }
}
```

Reconstructed trait:
```rust
#[async_trait]
pub trait AuthProvider: Send + Sync {
    async fn get_auth_header(&self) -> Result<(String, String)>;
}
```

## Pattern: Recovering Impl Blocks

When an `impl` block is scrubbed, the struct still exists. Consumers call methods like `.request()`, `.new()`, `.with_timeout()`. Reconstruct by:

1. Search for all method calls on the type
2. Group by method name, infer signatures
3. Build the minimal impl that satisfies all consumers
4. Add helper methods as needed

## Anti-Patterns

- **Partial patches.** Don't fix one method at a time and rebuild. The compiler cascades errors — fix all missing items in one pass.
- **execute_code read_file for large files.** The 500-line cap silently truncates. Use `terminal` heredoc for files > 500 lines.
- **Assuming features are always enabled.** Check `Cargo.toml` `[features]` and gate optional dependencies behind `#[cfg(feature = "...")]`.
