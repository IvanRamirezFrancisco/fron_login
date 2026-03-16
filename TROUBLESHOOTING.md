# 🔧 Troubleshooting - Botón "Nuevo Miembro" No Funciona

## Problema Reportado

El botón "Nuevo Miembro" no hace nada cuando se presiona.

## Errores en Consola

```
ERROR TypeError: can't access property "length", ctx.staffList is undefined
```

## ✅ Soluciones Aplicadas

### 1. Inicialización Robusta de Arrays

**Problema**: `staffList` podía ser undefined si la API fallaba  
**Solución**: Implementado getter/setter que siempre retorna un array

```typescript
private _staffList: StaffUser[] = [];
get staffList(): StaffUser[] {
  return this._staffList || [];
}
set staffList(value: StaffUser[]) {
  this._staffList = value || [];
}
```

### 2. Verificaciones en el Template

**Problema**: Template intentaba acceder a `.length` de undefined  
**Solución**: Agregado verificación adicional

```html
<!-- ANTES -->
<div *ngIf="!loading && staffList.length > 0">
  <!-- DESPUÉS -->
  <div *ngIf="!loading && staffList && staffList.length > 0"></div>
</div>
```

### 3. Manejo de Errores Mejorado

**Problema**: Cuando la API fallaba, no se inicializaba el array  
**Solución**: Siempre inicializar como array vacío en caso de error

```typescript
error: (error) => {
  console.error("Error al cargar staff:", error);
  this.staffList = []; // ← Asegurar que siempre sea un array
  this.loading = false;
};
```

### 4. Console Logs para Debug

**Problema**: No se sabía si el método se estaba ejecutando  
**Solución**: Agregados console.logs

```typescript
openCreateModal(): void {
  console.log('Abriendo modal de creación...');
  this.isEditMode = false;
  this.selectedUser = null;
  this.showModal = true;
  console.log('showModal:', this.showModal);
}
```

---

## 🔍 Pasos de Depuración

### Paso 1: Verificar Compilación

✅ El frontend está compilando correctamente  
✅ URL: http://localhost:4200/  
✅ Solo hay warnings menores (no errores)

### Paso 2: Verificar Backend

Abre otra terminal y ejecuta:

```bash
cd "segundo proyecto"
mvn spring-boot:run
```

Verifica que veas:

```
Started AuthSystemApplication in X.XXX seconds
Mapped endpoints: 180+
```

### Paso 3: Probar en el Navegador

1. **Abre el navegador**: http://localhost:4200
2. **Inicia sesión** con un usuario ADMIN
3. **Ve a**: http://localhost:4200/admin/staff
4. **Abre DevTools** (F12)
5. **Ve a la pestaña "Console"**
6. **Haz clic** en el botón "Nuevo Miembro"

**¿Qué deberías ver?**

#### ✅ Caso Éxito:

```
Abriendo modal de creación...
showModal: true
```

→ El modal debería aparecer en pantalla

#### ❌ Caso Fallo 1: No aparece nada en consola

**Problema**: El evento click no se está ejecutando  
**Posibles causas**:

- El componente no se cargó correctamente
- Hay un error previo que bloqueó la ejecución
- El botón está deshabilitado

**Solución**:

```javascript
// En la consola del navegador, ejecuta:
document.querySelector(".btn-wine").addEventListener("click", function () {
  console.log("Botón clickeado");
});
```

#### ❌ Caso Fallo 2: Aparecen los logs pero no el modal

**Problema**: El modal está configurado pero no se muestra  
**Posibles causas**:

- CSS de Bootstrap no cargado
- Estructura del modal incorrecta
- `*ngIf="showModal"` no se está evaluando

**Solución**: Verificar en la pestaña "Elements" del DevTools si existe el elemento con clase `modal`.

### Paso 4: Verificar Estado del Componente

En la consola del navegador, ejecuta:

```javascript
// Obtener el componente Angular
ng.getComponent(document.querySelector("app-admin-staff"));
```

Deberías ver el objeto del componente con propiedades:

- `showModal: false`
- `staffList: []`
- `roles: []`
- `loading: false`

### Paso 5: Verificar Llamadas HTTP

1. **Ve a la pestaña "Network"** en DevTools
2. **Filtra por**: XHR o Fetch/XHR
3. **Recarga la página**
4. Deberías ver 2 requests:
   - `GET /api/admin/users?page=0&size=10&sort=createdAt,desc`
   - `GET /api/admin/roles`

**Si ves Status 404 o 500**: El backend no tiene esos endpoints implementados

---

## 🐛 Errores Comunes y Soluciones

### Error 1: "Cannot GET /api/admin/users"

**Causa**: El backend no tiene el controlador `AdminUserController`  
**Solución**:

```bash
# Verificar que el backend tenga el archivo:
ls "segundo proyecto/src/main/java/com/security/controller/AdminUserController.java"
```

### Error 2: "401 Unauthorized"

**Causa**: JWT no está siendo enviado o expiró  
**Solución**:

1. Cierra sesión
2. Vuelve a iniciar sesión
3. Verifica en DevTools → Application → Local Storage → `auth_token`

### Error 3: "403 Forbidden"

**Causa**: Usuario no tiene rol ADMIN  
**Solución**:

1. Verifica en el backend que tu usuario tenga rol ADMIN o SUPER_ADMIN
2. Query SQL:

```sql
SELECT u.email, r.name
FROM user u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role r ON ur.role_id = r.id;
```

### Error 4: "CORS policy blocked"

**Causa**: Backend no permite requests desde localhost:4200  
**Solución**: Verificar `SecurityConfig.java` que tenga:

```java
.cors(cors -> cors.configurationSource(request -> {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
    config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH"));
    config.setAllowedHeaders(Arrays.asList("*"));
    config.setAllowCredentials(true);
    return config;
}))
```

### Error 5: Modal se abre pero está vacío

**Causa**: El componente `StaffFormModalComponent` no se está renderizando  
**Solución**: Verificar que el import esté correcto:

```typescript
import { StaffFormModalComponent } from './staff-form-modal.component';

@Component({
  //...
  imports: [CommonModule, FormsModule, ReactiveFormsModule, StaffFormModalComponent]
})
```

---

## 📊 Checklist de Verificación

Marca cada item que hayas verificado:

### Backend

- [ ] Backend está corriendo en `http://localhost:8080`
- [ ] Endpoint `/api/admin/users` existe
- [ ] Endpoint `/api/admin/roles` existe
- [ ] CORS está configurado correctamente
- [ ] SecurityConfig permite requests a `/admin/**`

### Frontend

- [ ] Frontend está corriendo en `http://localhost:4200`
- [ ] No hay errores de compilación (solo warnings)
- [ ] SweetAlert2 está instalado
- [ ] Bootstrap Icons están instalados

### Sesión

- [ ] Estás logueado con un usuario válido
- [ ] El usuario tiene rol ADMIN o SUPER_ADMIN
- [ ] El JWT no ha expirado
- [ ] El JWT se está enviando en los headers

### Componente

- [ ] La página `/admin/staff` carga sin errores
- [ ] Se ve el botón "Nuevo Miembro"
- [ ] El botón no está deshabilitado
- [ ] Al hacer click, aparecen los console.logs

### Modal

- [ ] `showModal` cambia a `true` al hacer click
- [ ] El elemento `<div class="modal">` aparece en el DOM
- [ ] El componente `<app-staff-form-modal>` se renderiza
- [ ] Se ve el formulario dentro del modal

---

## 🔬 Debug Avanzado

### Inspeccionar el Componente en Tiempo Real

```javascript
// En la consola del navegador:
const comp = ng.getComponent(document.querySelector("app-admin-staff"));

// Ver estado actual
console.log("showModal:", comp.showModal);
console.log("isEditMode:", comp.isEditMode);
console.log("selectedUser:", comp.selectedUser);
console.log("roles:", comp.roles);
console.log("staffList:", comp.staffList);

// Abrir el modal manualmente
comp.openCreateModal();

// Forzar detección de cambios
ng.applyChanges(comp);
```

### Verificar Eventos

```javascript
// Verificar que el botón tenga el evento registrado
const btn = document.querySelector(".btn-wine");
console.log("Botón encontrado:", btn);
console.log("Eventos:", getEventListeners(btn));
```

### Verificar Estructura del Modal

```javascript
// Después de hacer click en "Nuevo Miembro"
const modal = document.querySelector(".modal");
console.log("Modal en DOM:", modal);
console.log("Modal visible:", modal ? getComputedStyle(modal).display : "No existe");
```

---

## 💡 Solución Temporal

Si después de todos los pasos el modal aún no se abre, puedes probar esta solución temporal:

### Opción 1: Usar Bootstrap Modal JavaScript

```typescript
// En admin-staff.component.ts
import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";

export class AdminStaffComponent implements OnInit {
  @ViewChild("staffModal") modalElement!: ElementRef;

  openCreateModal(): void {
    console.log("Abriendo modal...");
    this.isEditMode = false;
    this.selectedUser = null;

    // Opción A: Bootstrap 5 modal
    const modalEl = document.getElementById("staffModal");
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }

    // Opción B: Simple toggle
    this.showModal = true;
  }
}
```

### Opción 2: Forzar Detección de Cambios

```typescript
import { ChangeDetectorRef } from "@angular/core";

export class AdminStaffComponent implements OnInit {
  constructor(
    private staffService: StaffService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef, // ← Agregar
  ) {}

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedUser = null;
    this.showModal = true;
    this.cdr.detectChanges(); // ← Forzar detección
  }
}
```

---

## 📞 Siguiente Paso

Por favor, intenta los pasos de depuración y repórtame:

1. **¿Qué aparece en la consola** cuando haces click en "Nuevo Miembro"?
2. **¿Qué status codes** ves en la pestaña Network?
3. **¿El backend está corriendo** correctamente?
4. **¿Ves el modal en el DOM** (pestaña Elements)?

Con esa información podré darte una solución más específica.
