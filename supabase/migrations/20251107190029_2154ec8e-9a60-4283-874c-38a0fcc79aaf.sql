-- Adicionar foreign key entre whatsapp_clients e planos
ALTER TABLE whatsapp_clients 
    ADD CONSTRAINT fk_plano_id 
    FOREIGN KEY (plano_id) 
    REFERENCES planos(id) 
    ON DELETE SET NULL;