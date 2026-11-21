-- Additive only. Apply once in homologation after 0050. Never resets existing data.
CREATE TABLE public_quote_requests (
 id INT AUTO_INCREMENT PRIMARY KEY,
 userId INT NOT NULL,
 requestKey VARCHAR(64) NOT NULL,
 conversaId INT NULL,
 operacaoId INT NULL,
 produto VARCHAR(255) NOT NULL,
 especificacoes TEXT NOT NULL,
 quantidade VARCHAR(40) NOT NULL,
 unidade VARCHAR(30) NOT NULL,
 destinoCidade VARCHAR(120) NOT NULL,
 destinoUf VARCHAR(2) NOT NULL,
 prazoDesejado VARCHAR(120) NOT NULL,
 status ENUM('recebida','em_analise','vinculada','encerrada') NOT NULL DEFAULT 'recebida',
 criadaEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizadaEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_public_quote_request(userId,requestKey),
 INDEX idx_public_quote_user(userId,criadaEm)
);
