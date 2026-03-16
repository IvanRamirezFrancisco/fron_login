# 🔍 DIAGNÓSTICO Y SOLUCIÓN DE ERRORES DEL PANEL ADMIN

## ❌ Errores Reportados

```
❌ Cupones: "Error al cargar cupones"
❌ Reseñas: "Error al cargar las reseñas"
❌ Carritos: "Error al cargar los carritos abandonados"
```

---

## 🎯 CAUSA PRINCIPAL: Error 401 (No autorizado)

El backend está respondiendo pero rechaza las peticiones porque:

- **No hay token JWT en las peticiones**
- **El token expiró**
- **El usuario no tiene rol ADMIN**

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Verificar Backend Activo

```bash
# En terminal PowerShell
Invoke-WebRequest -Uri "http://localhost:8080/api/admin/coupons"
```

**Resultado esperado**: `401 No autorizado` ✅ (significa que el backend funciona pero necesita auth)

---

### Paso 2: Crear Usuario ADMIN

#### Opción A: Usando la Base de Datos MySQL

```sql
-- Conectar a MySQL
mysql -u root -p

-- Usar tu base de datos
USE tu_base_de_datos;

-- Ver usuarios existentes
SELECT id, username, email FROM users;

-- Crear usuario admin (si no existe)
INSERT INTO users (username, email, password, enabled, account_non_expired, account_non_locked, credentials_non_expired)
VALUES ('admin', 'admin@example.com', '$2a$10$encoded_password_here', 1, 1, 1, 1);

-- Obtener el ID del usuario admin
SET @admin_user_id = (SELECT id FROM users WHERE username = 'admin');

-- Asignar rol ADMIN
INSERT INTO user_roles (user_id, role_id)
VALUES (@admin_user_id, (SELECT id FROM roles WHERE name = 'ROLE_ADMIN'));

-- Verificar
SELECT u.username, r.name as role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'admin';
```

#### Opción B: Endpoint de Registro (si existe)

```typescript
// Registrar nuevo usuario
POST http://localhost:8080/api/auth/register
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "Admin123!",
  "roles": ["ROLE_ADMIN"]
}
```

---

### Paso 3: Iniciar Sesión como ADMIN

1. **Ir a**: `http://localhost:4200/login`
2. **Credenciales**:
   ```
   Username: admin
   Password: Admin123! (o tu contraseña)
   ```
3. **Verificar token en DevTools**:
   - F12 → Console
   - Ejecutar: `localStorage.getItem('token')`
   - Debe retornar un token JWT largo

---

### Paso 4: Verificar Rol en el Token

```typescript
// En la consola del navegador (F12)
const token = localStorage.getItem("token");
if (token) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  console.log("User roles:", payload.roles || payload.authorities);
} else {
  console.log("No token found - please login");
}
```

**Debe mostrar**: `["ROLE_ADMIN"]` o `["ADMIN"]`

---

### Paso 5: Acceder al Panel Admin

1. **Con sesión iniciada**, ir a: `http://localhost:4200/admin`
2. **Deberías ser redirigido a**: `http://localhost:4200/admin/dashboard`
3. **Navegar por las secciones**:
   - Dashboard
   - Cupones
   - Reseñas
   - Carritos Abandonados

---

## 🔧 DIAGNÓSTICO ADICIONAL

### Verificar en Consola del Navegador

Abre DevTools (F12) → Console y revisa:

```javascript
// 1. Verificar token
console.log("Token:", localStorage.getItem("token"));

// 2. Verificar usuario actual
console.log("Current user:", localStorage.getItem("currentUser"));

// 3. Ver errores de red
// Ir a: Network → XHR → Ver peticiones fallidas
```

### Revisar Network Tab

1. F12 → **Network** tab
2. Intentar cargar cupones
3. Ver la petición a `/api/admin/coupons`
4. Verificar:
   - ❌ **Status 401**: No hay token o token inválido
   - ❌ **Status 403**: Token válido pero sin permisos ADMIN
   - ✅ **Status 200**: Todo OK

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "No hay token en localStorage"

**Solución**: Iniciar sesión como admin primero

### Problema 2: "Token existe pero sigue dando 401"

**Solución**: Token expiró, hacer logout y volver a login

### Problema 3: "403 Forbidden"

**Solución**: Usuario no tiene rol ADMIN, verificar en base de datos

### Problema 4: "CORS error"

**Solución**: Backend tiene `@CrossOrigin(origins = "*")` ✅ Ya está configurado

### Problema 5: "Backend no responde"

**Solución**:

```bash
# Verificar si está corriendo
cd "segundo proyecto"
mvn spring-boot:run
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Backend corriendo en puerto 8080
- [ ] Frontend corriendo en puerto 4200
- [ ] Usuario ADMIN creado en base de datos
- [ ] Rol ADMIN asignado al usuario
- [ ] Sesión iniciada con usuario ADMIN
- [ ] Token JWT en localStorage
- [ ] Token contiene rol ADMIN
- [ ] Interceptor agregando header Authorization

---

## 🎯 PRUEBA RÁPIDA CON POSTMAN/CURL

### 1. Login

```bash
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}
```

**Respuesta esperada**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "roles": ["ROLE_ADMIN"]
  }
}
```

### 2. Obtener Cupones (con token)

```bash
GET http://localhost:8080/api/admin/coupons?page=0&size=20
Authorization: Bearer {tu_token_aqui}
```

**Respuesta esperada**:

```json
{
  "content": [...],
  "totalElements": 0,
  "totalPages": 0
}
```

---

## 🔄 SI NADA FUNCIONA: Reset Completo

```bash
# 1. Limpiar localStorage
# En consola del navegador (F12):
localStorage.clear();

# 2. Reiniciar backend
# Ctrl+C en terminal del backend
cd "C:\Users\ivanf\Documents\7mo\Proyecto del login original y funcional\segundo proyecto"
mvn clean spring-boot:run

# 3. Reiniciar frontend
# Ctrl+C en terminal del frontend
npm start

# 4. Volver a login
```

---

## 📞 SIGUIENTE PASO

Una vez resuelto el problema de autenticación:

1. ✅ Crear cupón de prueba
2. ✅ Moderar reseñas
3. ✅ Ver carritos abandonados
4. 🎯 **Continuar con Products CRUD**

---

## 💡 NOTA IMPORTANTE

**El endpoint de Carritos Abandonados** (`/api/shopping-cart/abandoned`) podría no existir en tu backend. Necesitarías crear ese endpoint si no existe. El componente frontend ya está listo, solo falta el backend.

¿Necesitas ayuda creando el endpoint en el backend?
