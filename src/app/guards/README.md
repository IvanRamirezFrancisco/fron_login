# 🛡️ Guards de Navegación

Este directorio contiene los guards de Angular para controlar el acceso a las rutas.

## 📋 Guards Disponibles

### 1. **AuthGuard** (`auth.guard.ts`)

**Propósito:** Proteger rutas que requieren autenticación.

**Comportamiento:**

- ✅ Si el usuario ESTÁ logueado → Permite el acceso
- ❌ Si el usuario NO está logueado → Redirige a `/login`

**Uso:**

```typescript
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [authGuard] // ← Aplica el guard
}
```

**Rutas protegidas:**

- `/dashboard/*` - Panel de usuario
- `/carrito` - Carrito de compras
- `/checkout` - Proceso de compra
- `/perfil` - Perfil de usuario
- `/pedidos` - Historial de pedidos

---

### 2. **GuestGuard** (`guest.guard.ts`) ⭐ NUEVO

**Propósito:** Proteger rutas que solo pueden acceder usuarios NO autenticados.

**Comportamiento:**

- ✅ Si el usuario NO está logueado → Permite el acceso
- ❌ Si el usuario ESTÁ logueado → Redirige a `/dashboard`

**Uso:**

```typescript
{
  path: 'login',
  component: LoginComponent,
  canActivate: [guestGuard] // ← Impide acceso a usuarios logueados
}
```

**Rutas protegidas:**

- `/login` - Página de inicio de sesión
- `/register` - Página de registro
- `/forgot-password` - Recuperar contraseña
- `/reset-password` - Restablecer contraseña

**Razón:** Evita que usuarios ya autenticados accedan a páginas de autenticación.

---

### 3. **AdminGuard** (`admin.guard.ts`)

**Propósito:** Proteger rutas administrativas que requieren rol de administrador.

**Comportamiento:**

- ✅ Si el usuario es ADMIN → Permite el acceso
- ❌ Si el usuario NO es ADMIN → Redirige a `/home`

**Uso:**

```typescript
{
  path: 'admin',
  component: AdminLayoutComponent,
  canActivate: [AdminGuard] // ← Solo admins
}
```

**Rutas protegidas:**

- `/admin/*` - Todas las rutas administrativas
- `/admin/dashboard` - Panel de administración
- `/admin/usuarios` - Gestión de usuarios
- `/admin/productos` - Gestión de productos

---

## 🔄 Flujo de Navegación

### Usuario NO Autenticado:

```
┌─────────────────────────────────────────┐
│ Usuario intenta acceder a /dashboard   │
└────────────────┬────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  AuthGuard    │
         │  Verifica...  │
         └───────┬───────┘
                 │
                 ▼
      ❌ NO autenticado
                 │
                 ▼
    🔀 Redirige a /login
```

### Usuario Autenticado Intenta Login:

```
┌─────────────────────────────────────────┐
│ Usuario logueado intenta /login        │
└────────────────┬────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  GuestGuard   │
         │  Verifica...  │
         └───────┬───────┘
                 │
                 ▼
      ✅ YA autenticado
                 │
                 ▼
   🔀 Redirige a /dashboard
```

---

## 📝 Implementación Técnica

### AuthGuard (Funcional Guard)

```typescript
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true; // ✅ Permitir
  }

  router.navigate(["/login"]);
  return false; // ❌ Bloquear
};
```

### GuestGuard (Funcional Guard)

```typescript
export const guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(["/dashboard"]);
    return false; // ❌ Bloquear (usuario ya logueado)
  }

  return true; // ✅ Permitir (usuario no logueado)
};
```

---

## 🧪 Testing

Cada guard tiene su archivo `.spec.ts` con pruebas unitarias:

```bash
npm test -- --include='**/guards/*.spec.ts'
```

---

## 🔐 Seguridad

### Validaciones Implementadas:

1. ✅ **Token JWT** verificado en cada petición
2. ✅ **Expiración** del token validada
3. ✅ **Roles** de usuario verificados (para AdminGuard)
4. ✅ **Estado de autenticación** persistido en localStorage
5. ✅ **Redirecciones automáticas** según estado del usuario

### Mejores Prácticas:

- Guards funcionales (Angular 17+)
- Uso de `inject()` para servicios
- Logs en consola para debugging
- Tests unitarios completos
- Documentación clara

---

## 📚 Recursos

- [Angular Guards Documentation](https://angular.io/guide/router#preventing-unauthorized-access)
- [Functional Guards (Angular 15+)](https://angular.io/guide/router#functional-guards)
