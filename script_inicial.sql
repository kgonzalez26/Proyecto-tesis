-- IMPORTADORA LOS GEMELOS - ESQUEMA CONSOLIDADO
CREATE DATABASE IF NOT EXISTS importadora_los_gemelos;
USE importadora_los_gemelos;

-- 1. SEGURIDAD Y CONTROL DE ACCESO

CREATE TABLE Usuario (
    USER_ID INT AUTO_INCREMENT NOT NULL,
    Nombre_Usuario VARCHAR(50) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Contrasena_Hash CHAR(60) NOT NULL,
    Estado_Cuenta TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (USER_ID)
) ENGINE=InnoDB;

CREATE TABLE Rol (
    ROL_ID INT AUTO_INCREMENT NOT NULL,
    Nombre_Rol VARCHAR(50) NOT NULL UNIQUE,
    Descripcion VARCHAR(255) NULL,
    PRIMARY KEY (ROL_ID)
) ENGINE=InnoDB;

CREATE TABLE Usuario_Rol (
    USER_ID INT NOT NULL,
    ROL_ID INT NOT NULL,
    PRIMARY KEY (USER_ID, ROL_ID),
    CONSTRAINT FK_UR_Usuario FOREIGN KEY (USER_ID)
        REFERENCES Usuario (USER_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_UR_Rol FOREIGN KEY (ROL_ID)
        REFERENCES Rol (ROL_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Cliente (
    CLIENTE_ID INT AUTO_INCREMENT NOT NULL,
    Nombre_Completo VARCHAR(120) NOT NULL,
    Email VARCHAR(100) NOT NULL,
    Telefono VARCHAR(30) NULL,
    NIT VARCHAR(20) NULL,
    USER_ID INT NULL,
    Activo TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (CLIENTE_ID),
    CONSTRAINT FK_Cliente_Usuario FOREIGN KEY (USER_ID)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 2. CATALOGOS

-- VALIDAR ESTA SECUENCIA CON EL AGENTE ADUANAL.
CREATE TABLE Catalogo_Estado_Logistico (
    ESTADO_ID INT AUTO_INCREMENT NOT NULL,
    Nombre_Estado VARCHAR(60) NOT NULL UNIQUE,
    Orden_Secuencia INT NOT NULL,
    Descripcion VARCHAR(255) NULL,
    Visible_Cliente TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (ESTADO_ID)
) ENGINE=InnoDB;

CREATE TABLE Catalogo_Requisito_Documental (
    REQ_ID INT AUTO_INCREMENT NOT NULL,
    Nombre_Requisito VARCHAR(80) NOT NULL UNIQUE,
    Descripcion VARCHAR(255) NULL,
    Obligatorio TINYINT(1) NOT NULL DEFAULT 1,
    Aplica_Vencimiento TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (REQ_ID)
) ENGINE=InnoDB;

-- 3. UNIDADES

CREATE TABLE Unidad_Importada (
    VIN_Unidad VARCHAR(20) NOT NULL,
    Marca VARCHAR(50) NOT NULL,
    Modelo VARCHAR(50) NOT NULL,
    Anio INT NOT NULL,
    Cilindrada_CC INT NULL,
    Origen_Subasta VARCHAR(50) NULL,
    Lote_Subasta VARCHAR(50) NULL,
    Precio_Compra_USD DECIMAL(10,2) NULL,
    Fecha_Compra DATE NOT NULL,
    Estado_Actual_ID INT NOT NULL,
    Cliente_ID INT NULL,
    COTIZACION_ID INT NULL,
    Activo TINYINT(1) NOT NULL DEFAULT 1,
    USER_ID_Registro INT NULL,
    PRIMARY KEY (VIN_Unidad),
    CONSTRAINT FK_Unidad_Usuario FOREIGN KEY (USER_ID_Registro)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Unidad_Estado FOREIGN KEY (Estado_Actual_ID)
        REFERENCES Catalogo_Estado_Logistico (ESTADO_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Unidad_Cliente FOREIGN KEY (Cliente_ID)
        REFERENCES Cliente (CLIENTE_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Historial_Estado_Logistico (
    HIST_ID INT AUTO_INCREMENT NOT NULL,
    VIN_Unidad VARCHAR(20) NOT NULL,
    ESTADO_ID INT NOT NULL,
    Fecha_Cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Comentario VARCHAR(255) NULL,
    USER_ID_Registro INT NULL,
    PRIMARY KEY (HIST_ID),
    CONSTRAINT FK_Hist_Unidad FOREIGN KEY (VIN_Unidad)
        REFERENCES Unidad_Importada (VIN_Unidad) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Hist_Estado FOREIGN KEY (ESTADO_ID)
        REFERENCES Catalogo_Estado_Logistico (ESTADO_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Hist_Usuario FOREIGN KEY (USER_ID_Registro)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Expediente_Aduanero (
    EXP_ID INT AUTO_INCREMENT NOT NULL,
    VIN_Unidad VARCHAR(20) NOT NULL,
    Fecha_Llegada DATE NULL,
    Aduana_Ingreso VARCHAR(100) NULL,
    Canal_Verificacion ENUM('Verde','Amarillo','Rojo') NULL,
    Activo TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (EXP_ID),
    CONSTRAINT FK_Expediente_Unidad FOREIGN KEY (VIN_Unidad)
        REFERENCES Unidad_Importada (VIN_Unidad) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Expediente_Requisito (
    EXP_REQ_ID INT AUTO_INCREMENT NOT NULL,
    EXP_ID INT NOT NULL,
    REQ_ID INT NOT NULL,
    Estado ENUM('Pendiente','Entregado','Rechazado','Vencido') NOT NULL DEFAULT 'Pendiente',
    Fecha_Vencimiento DATE NULL,
    Fecha_Actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    USER_ID_Validador INT NULL,
    PRIMARY KEY (EXP_REQ_ID),
    UNIQUE KEY UQ_Exp_Requisito (EXP_ID, REQ_ID),
    CONSTRAINT FK_ExpReq_Expediente FOREIGN KEY (EXP_ID)
        REFERENCES Expediente_Aduanero (EXP_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_ExpReq_Requisito FOREIGN KEY (REQ_ID)
        REFERENCES Catalogo_Requisito_Documental (REQ_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_ExpReq_Usuario FOREIGN KEY (USER_ID_Validador)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 4. COTIZACIONES

CREATE TABLE Cotizacion (
    COTIZACION_ID INT AUTO_INCREMENT NOT NULL,
    Cliente_ID INT NULL,
    Marca VARCHAR(50) NOT NULL,
    Modelo VARCHAR(50) NOT NULL,
    Anio INT NOT NULL,
    Cilindrada_CC INT NULL,

    Precio_Origen_USD DECIMAL(10,2) NOT NULL,
    Flete_USD DECIMAL(10,2) NOT NULL,
    Seguro_USD DECIMAL(10,2) NOT NULL,
    Otros_Gastos_Estimados_USD DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Tasa_Cambio_Usada DECIMAL(6,3) NOT NULL,

    Valor_CIF_USD DECIMAL(10,2) NOT NULL,
    DAI_USD DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    IVA_USD DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    IPRIMA_USD DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Costo_Total_USD DECIMAL(10,2) NOT NULL,

    Precio_Venta_Propuesto_USD DECIMAL(10,2) NULL,
    Margen_Bruto_USD DECIMAL(10,2) NULL,
    Margen_Porcentaje DECIMAL(5,2) NULL,
    Basado_En_Referencia_VIN VARCHAR(20) NULL,

    Estado ENUM('Borrador','Pendiente_Validacion','Aprobada','Rechazada','Enviada','Solicitada','Atendida') NOT NULL DEFAULT 'Borrador',
    Origen ENUM('Interna','Cliente') NOT NULL DEFAULT 'Interna',
    USER_ID_Creador INT NULL,
    USER_ID_Validador INT NULL,
    Fecha_Creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Fecha_Validacion DATETIME NULL,
    Fecha_Envio_Cliente DATETIME NULL,

    PRIMARY KEY (COTIZACION_ID),
    CONSTRAINT FK_Cotizacion_Cliente FOREIGN KEY (Cliente_ID)
        REFERENCES Cliente (CLIENTE_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Cotizacion_Usuario_Creador FOREIGN KEY (USER_ID_Creador)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Cotizacion_Usuario_Validador FOREIGN KEY (USER_ID_Validador)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Cotizacion_Referencia FOREIGN KEY (Basado_En_Referencia_VIN)
        REFERENCES Unidad_Importada (VIN_Unidad) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Relación diferida de Unidad_Importada: se agrega aquí porque Cotizacion ya existe.
ALTER TABLE Unidad_Importada
    ADD CONSTRAINT FK_Unidad_Cotizacion FOREIGN KEY (COTIZACION_ID)
        REFERENCES Cotizacion (COTIZACION_ID) ON DELETE SET NULL ON UPDATE CASCADE;


-- 5. FINANZAS
CREATE TABLE Venta (
    VENTA_ID INT AUTO_INCREMENT NOT NULL,
    VIN_Unidad VARCHAR(20) NOT NULL UNIQUE,
    Cliente_ID INT NULL,
    Precio_Venta_Real_USD DECIMAL(12,2) NOT NULL,
    Fecha_Venta DATE NOT NULL,
    USER_ID_Vendedor INT NULL,
    PRIMARY KEY (VENTA_ID),
    CONSTRAINT FK_Venta_Unidad FOREIGN KEY (VIN_Unidad)
        REFERENCES Unidad_Importada (VIN_Unidad) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Venta_Cliente FOREIGN KEY (Cliente_ID)
        REFERENCES Cliente (CLIENTE_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Venta_Usuario FOREIGN KEY (USER_ID_Vendedor)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 6. ARCHIVOS, FOTOS Y BITACORA

CREATE TABLE Documentos (
    DOC_ID INT AUTO_INCREMENT NOT NULL,
    EXP_ID INT NOT NULL,
    REQ_ID INT NOT NULL,
    Nombre_Archivo VARCHAR(100) NOT NULL,
    Ruta_Archivo_Cloud VARCHAR(255) NOT NULL,
    Fecha_Carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Activo TINYINT(1) NOT NULL DEFAULT 1,
    USER_ID_Carga INT NULL,
    PRIMARY KEY (DOC_ID),
    CONSTRAINT FK_Documentos_Expediente FOREIGN KEY (EXP_ID)
        REFERENCES Expediente_Aduanero (EXP_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Documentos_Requisito FOREIGN KEY (REQ_ID)
        REFERENCES Catalogo_Requisito_Documental (REQ_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Documentos_Usuario FOREIGN KEY (USER_ID_Carga)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Foto_Vehiculo (
    FOTO_ID INT AUTO_INCREMENT NOT NULL,
    VIN_Unidad VARCHAR(20) NOT NULL,
    Categoria ENUM('Subasta', 'Recepcion', 'Otro') NOT NULL DEFAULT 'Otro',
    Nombre_Archivo VARCHAR(100) NOT NULL,
    Ruta_Archivo_Cloud VARCHAR(255) NOT NULL,
    Fecha_Carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Activo TINYINT(1) NOT NULL DEFAULT 1,
    USER_ID_Carga INT NULL,
    PRIMARY KEY (FOTO_ID),
    CONSTRAINT FK_Foto_Unidad FOREIGN KEY (VIN_Unidad)
        REFERENCES Unidad_Importada (VIN_Unidad) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Foto_Usuario FOREIGN KEY (USER_ID_Carga)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Log_Actividad (
    LOG_ID INT AUTO_INCREMENT NOT NULL,
    USER_ID INT NULL,
    Nombre_Usuario_Snapshot VARCHAR(50) NULL,
    Accion VARCHAR(50) NOT NULL,
    Entidad_Tipo VARCHAR(40) NULL,
    Entidad_ID VARCHAR(50) NULL,
    Descripcion VARCHAR(255) NULL,
    IP_Origen VARCHAR(45) NULL,
    Fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (LOG_ID),
    CONSTRAINT FK_Log_Usuario FOREIGN KEY (USER_ID)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_log_fecha ON Log_Actividad (Fecha DESC);
CREATE INDEX idx_log_usuario ON Log_Actividad (USER_ID);


-- 7. VISTAS
CREATE VIEW Vista_Margen_Real AS
SELECT
    u.VIN_Unidad,
    u.Marca,
    u.Modelo,
    u.Anio,
    c.Costo_Total_USD AS Costo_Total_Importacion,
    v.Precio_Venta_Real_USD,
    (v.Precio_Venta_Real_USD - c.Costo_Total_USD) AS Margen_Real_USD,
    ROUND(((v.Precio_Venta_Real_USD - c.Costo_Total_USD) / v.Precio_Venta_Real_USD) * 100, 2) AS Margen_Real_Pct,
    v.Fecha_Venta
FROM Venta v
JOIN Unidad_Importada u ON u.VIN_Unidad = v.VIN_Unidad
JOIN Cotizacion c ON c.COTIZACION_ID = u.COTIZACION_ID;

CREATE VIEW Vista_Estado_Actual_Unidad AS
SELECT
    u.VIN_Unidad,
    u.Marca,
    u.Modelo,
    u.Anio,
    cel.Nombre_Estado,
    cel.Orden_Secuencia,
    h.Fecha_Cambio AS Fecha_Ultimo_Cambio
FROM Unidad_Importada u
JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = u.Estado_Actual_ID
LEFT JOIN Historial_Estado_Logistico h ON h.VIN_Unidad = u.VIN_Unidad
    AND h.HIST_ID = (SELECT MAX(h2.HIST_ID) FROM Historial_Estado_Logistico h2 WHERE h2.VIN_Unidad = u.VIN_Unidad);

CREATE VIEW Vista_Requisitos_Pendientes AS
SELECT
    ea.EXP_ID,
    ea.VIN_Unidad,
    crd.Nombre_Requisito,
    er.Estado,
    er.Fecha_Vencimiento
FROM Expediente_Requisito er
JOIN Expediente_Aduanero ea ON ea.EXP_ID = er.EXP_ID
JOIN Catalogo_Requisito_Documental crd ON crd.REQ_ID = er.REQ_ID
WHERE er.Estado IN ('Pendiente', 'Rechazado', 'Vencido');


-- 8. DATOS INICIALES

INSERT IGNORE INTO Rol (Nombre_Rol, Descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Tramitador', 'Gestiona vehículos, expedientes aduaneros y tracking'),
('Mecánico', 'Acceso al tracking de unidades'),
('Finanzas', 'Gestiona cotizaciones y calculadora de costos'),
('Cliente', 'Seguimiento de sus vehículos y cotizaciones propias');

INSERT IGNORE INTO Catalogo_Estado_Logistico (Nombre_Estado, Orden_Secuencia, Descripcion, Visible_Cliente) VALUES
('Compra en Origen', 1, 'Vehículo adquirido, pendiente de embarque', 1),
('En Tránsito Marítimo', 2, 'Embarcado, en camino al puerto de destino', 1),
('Arribo a Puerto', 3, 'Buque arribó, unidad en depósito/almacén fiscal', 1),
('DUA Presentada', 4, 'Declaración Única Aduanera presentada a SAT', 1),
('En Verificación (Aforo)', 5, 'Asignado canal de revisión (verde/amarillo/rojo)', 1),
('Impuestos Pagados', 6, 'DAI/IVA/IPRIMA liquidados y pagados', 1),
('Liberada de Aduana', 7, 'Levante otorgado, unidad disponible', 1),
('Trámite de Placas', 8, 'Primera matrícula / circulación en gestión', 1),
('En Predio - Lista para Venta', 9, 'Unidad físicamente disponible en lote', 1),
('Vendida', 10, 'Unidad entregada al comprador', 1);

INSERT IGNORE INTO Catalogo_Requisito_Documental (Nombre_Requisito, Descripcion, Obligatorio, Aplica_Vencimiento) VALUES
('Bill of Lading (BL)', 'Documento de embarque', 1, 0),
('DUA', 'Declaración Única Aduanera', 1, 0),
('Póliza de Seguro', 'Cobertura de transporte', 1, 1),
('Certificado de Origen', 'Origen del vehículo', 0, 0),
('Título de Propiedad', 'Título original del vehículo', 1, 0),
('Factura Comercial', 'Factura de compra en origen', 1, 0);

INSERT IGNORE INTO Catalogo_Tipo_Gasto (Nombre, Descripcion) VALUES
('Flete Marítimo', 'Transporte internacional'),
('Seguro de Transporte', 'Cobertura durante el traslado'),
('Honorarios Agente Aduanal', 'Gestión de trámites aduaneros'),
('Almacenaje Portuario', 'Bodegaje en puerto'),
('Transporte Interno', 'Traslado puerto -> predio'),
('Placas y Circulación', 'Trámite de primera matrícula'),
('Comisión Bancaria', 'Transferencias internacionales'),
('Imprevistos', 'Gastos no planificados');