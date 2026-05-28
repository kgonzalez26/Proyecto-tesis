CREATE DATABASE IF NOT EXISTS importadora_los_gemelos;
USE importadora_los_gemelos;

-- =========================================================================
-- 1. MÓDULO DE SEGURIDAD Y CONTROL DE ACCESO (RBAC)
-- Se crean primero para permitir la auditoría en los demás módulos
-- =========================================================================

-- Tabla: Usuario
CREATE TABLE Usuario (
    USER_ID INT AUTO_INCREMENT NOT NULL,
    Nombre_Usuario VARCHAR(50) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Contrasena_Hash CHAR(60) NOT NULL, -- Longitud fija ideal para bcrypt
    Estado_Cuenta TINYINT(1) NOT NULL DEFAULT 1, -- 1 = Activo, 0 = Suspendido
    PRIMARY KEY (USER_ID)
) ENGINE=InnoDB;

-- Tabla: Rol
CREATE TABLE Rol (
    ROL_ID INT AUTO_INCREMENT NOT NULL,
    Nombre_Rol VARCHAR(50) NOT NULL UNIQUE,
    Descripcion VARCHAR(255) NULL,
    PRIMARY KEY (ROL_ID)
) ENGINE=InnoDB;

-- Tabla Intermedia: Usuario_Rol
CREATE TABLE Usuario_Rol (
    USER_ID INT NOT NULL,
    ROL_ID INT NOT NULL,
    PRIMARY KEY (USER_ID, ROL_ID),
    CONSTRAINT FK_UR_Usuario FOREIGN KEY (USER_ID) 
        REFERENCES Usuario (USER_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_UR_Rol FOREIGN KEY (ROL_ID) 
        REFERENCES Rol (ROL_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================================
-- 2. MÓDULO DE INVENTARIO (UNIDADES)
-- =========================================================================

-- Tabla: Unidad_Importada
CREATE TABLE Unidad_Importada (
    VIN_Unidad VARCHAR(20) NOT NULL,
    Marca VARCHAR(50) NOT NULL,
    Modelo VARCHAR(50) NOT NULL,
    Anio INT NOT NULL,
    Fecha_Compra DATE NOT NULL,
    Estado_Actual ENUM('En Tránsito', 'Aduana', 'Predio', 'Vendido') NOT NULL DEFAULT 'En Tránsito',
    Activo TINYINT(1) NOT NULL DEFAULT 1, -- Borrado lógico (Cumplimiento SAT)
    USER_ID_Registro INT NULL,           -- Auditoría: Quién registró el vehículo
    PRIMARY KEY (VIN_Unidad),
    CONSTRAINT FK_Unidad_Usuario FOREIGN KEY (USER_ID_Registro)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Tabla: Expediente_Aduanero
CREATE TABLE Expediente_Aduanero (
    EXP_ID INT AUTO_INCREMENT NOT NULL,
    VIN_Unidad VARCHAR(20) NOT NULL,
    Fecha_Llegada DATE NULL,
    Aduana_Ingreso VARCHAR(100) NULL,
    
    -- Checklist de Documentación (0 = Falta, 1 = Entregado)
    Check_DUA TINYINT(1) NOT NULL DEFAULT 0,
    Check_Poliza TINYINT(1) NOT NULL DEFAULT 0,
    Check_Certificado_Origen TINYINT(1) NOT NULL DEFAULT 0,
    Check_Titulo_Propiedad TINYINT(1) NOT NULL DEFAULT 0,
    
    -- Estado global calculado por el backend
    Estado_Documentacion ENUM('Pendiente', 'Incompleta', 'Completa') NOT NULL DEFAULT 'Pendiente',
    Activo TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (EXP_ID),
    CONSTRAINT FK_Expediente_Unidad FOREIGN KEY (VIN_Unidad) 
        REFERENCES Unidad_Importada (VIN_Unidad) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================================
-- 3. MÓDULO FINANCIERO Y COSTOS (Mantiene estricta restricción de borrado)
-- =========================================================================

-- Tabla: Gastos_Operativos
CREATE TABLE Gastos_Operativos (
    GASTO_ID INT AUTO_INCREMENT NOT NULL,
    EXP_ID INT NOT NULL,
    Tipo_Gasto VARCHAR(50) NOT NULL,
    Monto DECIMAL(10, 2) NOT NULL,
    Fecha_Pago DATE NOT NULL,
    Activo TINYINT(1) NOT NULL DEFAULT 1, -- Borrado lógico para no alterar la contabilidad
    USER_ID_Registro INT NULL,            -- Auditoría: Quién pagó/registró el gasto
    PRIMARY KEY (GASTO_ID),
    CONSTRAINT FK_Gastos_Expediente FOREIGN KEY (EXP_ID) 
        REFERENCES Expediente_Aduanero (EXP_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Gastos_Usuario FOREIGN KEY (USER_ID_Registro)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Tabla: Costo_Calculado
CREATE TABLE Costo_Calculado (
    COSTO_ID INT AUTO_INCREMENT NOT NULL,
    EXP_ID INT NOT NULL UNIQUE, 
    Costo_Total_Importacion DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    Margen_Bruto_Estimado DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    Precio_Venta_Sugerido DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (COSTO_ID),
    CONSTRAINT FK_Costos_Expediente FOREIGN KEY (EXP_ID) 
        REFERENCES Expediente_Aduanero (EXP_ID) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =========================================================================
-- 4. MÓDULO DE ARCHIVO DIGITAL
-- =========================================================================

-- Tabla: Documentos
CREATE TABLE Documentos (
    DOC_ID INT AUTO_INCREMENT NOT NULL,
    EXP_ID INT NOT NULL,
    Tipo_Documento_Aduanal ENUM('DUA', 'Póliza', 'Certificado_Origen', 'Título', 'Otro') NOT NULL,
    Nombre_Archivo VARCHAR(100) NOT NULL,
    Ruta_Archivo_Cloud VARCHAR(255) NOT NULL,
    Fecha_Carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Activo TINYINT(1) NOT NULL DEFAULT 1,
    USER_ID_Carga INT NULL,               -- Auditoría: Quién subió el archivo
    PRIMARY KEY (DOC_ID),
    CONSTRAINT FK_Documentos_Expediente FOREIGN KEY (EXP_ID) 
        REFERENCES Expediente_Aduanero (EXP_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Documentos_Usuario FOREIGN KEY (USER_ID_Carga)
        REFERENCES Usuario (USER_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;