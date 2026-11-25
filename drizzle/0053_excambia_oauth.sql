CREATE TABLE excambia_oauth_records (
  id CHAR(64) PRIMARY KEY,
  model VARCHAR(40) NOT NULL,
  payload JSON NOT NULL,
  uid CHAR(64),
  userCode CHAR(64),
  grantId CHAR(64),
  expiresAt INT UNSIGNED,
  consumedAt INT UNSIGNED,
  INDEX idx_excambia_oauth_uid (uid),
  INDEX idx_excambia_oauth_user_code (userCode),
  INDEX idx_excambia_oauth_grant (grantId),
  INDEX idx_excambia_oauth_expires (expiresAt)
);
