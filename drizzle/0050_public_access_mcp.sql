-- Run ONCE on a backed-up MySQL 8 staging copy, then homologate before production.
-- Existing roles, hashes, ownership and user records are not updated or deleted.
ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','public') NOT NULL DEFAULT 'user',
 ADD COLUMN approvalStatus ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
 ADD COLUMN sessionVersion INT NOT NULL DEFAULT 0;
CREATE TABLE security_audit (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 actorId INT NULL, action VARCHAR(100) NOT NULL, outcome VARCHAR(30) NOT NULL,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_security_audit_actor (actorId,createdAt)
);
CREATE TABLE security_limits (
 bucketKey CHAR(64) NOT NULL, bucket BIGINT NOT NULL, used INT NOT NULL,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(bucketKey,bucket), INDEX idx_security_limits_created (createdAt)
);
CREATE TABLE mcp_identities (
 id INT AUTO_INCREMENT PRIMARY KEY,
 issuer VARCHAR(255) NOT NULL, subject VARCHAR(255) NOT NULL,
 clientId VARCHAR(255) NOT NULL, userId INT NOT NULL,
 scopes VARCHAR(255) NOT NULL DEFAULT '', enabled BOOLEAN NOT NULL DEFAULT FALSE,
 notBefore TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_mcp_identity (issuer,subject,clientId),
 FOREIGN KEY(userId) REFERENCES users(id)
);
