
/*ORACLE*/
DROP TABLE ACCOUNTS;
DROP SEQUENCE SEQ_ACCOUNTS;
DROP TABLE EVENTS;
DROP SEQUENCE SEQ_EVENTS;

CREATE TABLE ACCOUNTS (
    ID INTEGER NOT NULL PRIMARY KEY,
    EMAIL VARCHAR2(500) NOT NULL UNIQUE,
    PASSWORD VARCHAR2(64),
    COMPLETE_NAME VARCHAR2(500) NOT NULL,
    TOKEN VARCHAR2 (32) NOT NULL,
    ISADM NUMBER DEFAULT 1 NOT NULL 
);

CREATE SEQUENCE SEQ_ACCOUNTS START WITH 1 INCREMENT BY 1;

INSERT INTO ACCOUNTS (
    ID,
    EMAIL,
    PASSWORD,
    COMPLETE_NAME,
    TOKEN,
    ISADM
) VALUES (
    SEQ_ACCOUNTS.NEXTVAL,
    'joao@gmail.com',
    'senha',
    'Joao Silva',
    dbms_random.string('x', 32),
    2
);

CREATE TABLE EVENTS (
    id_evento INTEGER NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    titulo VARCHAR2(50) NOT NULL,
    descricao VARCHAR2(150) NOT NULL, 
    valor_cota FLOAT NOT NULL,
    data_hora_inicio TIMESTAMP NOT NULL,  
    data_hora_fim TIMESTAMP NOT NULL,     
    data_evento DATE NOT NULL,      
    status_evento VARCHAR2(45) DEFAULT 'PENDENTE' NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES ACCOUNTS(ID)
);


CREATE SEQUENCE SEQ_EVENTS START WITH 1 INCREMENT BY 1;

CREATE TABLE APOSTA (
    id_aposta INTEGER NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    valor FLOAT NOT NULL,
    tipo VARCHAR2(50) NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    valor_retorno FLOAT,
    decisao_aposta VARCHAR2(50) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES ACCOUNTS(ID),
    FOREIGN KEY (id_evento) REFERENCES EVENTS(id_evento)   
);

CREATE SEQUENCE SEQ_APOSTA START WITH 1 INCREMENT BY 1;

CREATE TABLE CARTEIRA (
    id_carteira INTEGER NOT NULL PRIMARY KEY,
    valor FLOAT DEFAULT 0 NOT NULL,
    FOREIGN key(id_usuario) REFERENCES ACCOUNTS(ID)
);
CREATE SEQUENCE SEQ_CARTEIRA START WITH 1 INCREMENT BY 1;

CREATE TABLE TRANSACAO (
    id_transacao INTEGER NOT NULL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_evento INT,
    valor FLOAT NOT NULL,
    tipo VARCHAR2(50) NOT NULL,
    data_transacao TIMESTAMP NOT NULL,
    FOREIGN KEY(id_usuario) REFERENCES ACCOUNTS(ID),
    FOREIGN KEY(id_evento) REFERENCES EVENTS(id_evento)
);

CREATE SEQUENCE SEQ_TRANSACAO START WITH 1 INCREMENT BY 1;

COMMIT;