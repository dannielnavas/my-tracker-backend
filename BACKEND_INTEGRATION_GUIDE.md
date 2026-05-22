# Guía de Integración y Especificación del Backend — Focus Loop

Este documento sirve como la especificación técnica de la API REST para **Focus Loop**. Está diseñado para que cualquier desarrollador o agente de IA (como Antigravity) pueda construir, probar y desplegar los servicios del backend de forma que sean 100% compatibles con la interfaz de usuario de Angular actual.

---

## 1. Configuración Global y Seguridad

### URL Base del Backend
El frontend tiene configurado de manera rígida la siguiente URL para producción:
`https://focus-loop-api.danniel.dev`

> [!TIP]
> **Recomendación para el Frontend:** Se sugiere parametrizar la URL base mediante `environment.apiUrl` para poder alternar entre `http://localhost:3000` (desarrollo local) y producción de manera sencilla.

### Autenticación e Interceptor
La aplicación utiliza autenticación basada en tokens JWT.
* **Cabecera obligatoria:** Todas las peticiones, con excepción de `/auth/login` y el registro (`POST /users`), deben incluir la cabecera:
  `Authorization: Bearer <JWT_TOKEN>`
* **Manejo de Errores (401 Unauthorized):** Si cualquier endpoint protegido responde con un código `401`, el frontend limpiará automáticamente la sesión local y redirigirá al usuario a la pantalla de inicio de sesión (`/`).

---

## 2. Modelos de Datos Requeridos (Contracts)

El backend debe recibir y responder con objetos JSON que respeten estrictamente la estructura de los modelos definidos en el frontend:

### 2.1 Autenticación y Usuarios
#### `Auth` (Petición de Login)
```json
{
  "email": "user@example.com",
  "password": "user_password_here"
}
```

#### `LoginResponse` (Respuesta de Login)
```json
{
  "access_token": "jwt_token_string",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "full_name": "Nombre de Usuario",
    "profile_image": "https://example.com/avatar.png",
    "role": "user",
    "created_at": "2026-05-22T12:00:00Z",
    "updated_at": "2026-05-22T12:00:00Z",
    "subscriptionPlan": {
      "subscription_plan_id": 1,
      "name": "free",
      "price": "0.00",
      "description": "Plan Gratuito",
      "created_at": "2026-05-22T12:00:00Z",
      "updated_at": "2026-05-22T12:00:00Z"
    }
  }
}
```

#### `CreateUser` (Petición de Registro)
```json
{
  "email": "user@example.com",
  "full_name": "Nombre Completo",
  "profile_image": "base64_or_image_url",
  "role": "user",
  "password": "secure_password",
  "subscription_plan_id": "1"
}
```

### 2.2 Sprints
#### `Sprint` (Estructura Base para Creación/Modificación)
```json
{
  "sprint_id": 1,
  "name": "Sprint 1",
  "description": "Descripción del sprint",
  "start_date": "2026-05-22",
  "end_date": "2026-06-05",
  "status": "active", // Opciones: "active" | "completed" | "planned"
  "user_id": 1
}
```

#### `SprintResponse` (Respuesta de Listado)
Debe incluir contadores acumulados de las tareas en cada estado para el cálculo de estadísticas en la interfaz:
```json
{
  "sprint_id": 1,
  "name": "Sprint 1",
  "description": "Descripción del sprint",
  "start_date": "2026-05-22",
  "end_date": "2026-06-05",
  "status": "active",
  "user_id": 1,
  "countTaskPending": 12,
  "countTaskInProgress": 3,
  "countTaskCompleted": 15
}
```

### 2.3 Tareas y Estados
> [!IMPORTANT]
> El frontend requiere la existencia de mapeos de estados a través de IDs específicos:
> * **`status_task_id = 1`** -> "Pending" (Pendiente)
> * **`status_task_id = 2`** -> "In Progress" (En Progreso)
> * **`status_task_id = 3`** -> "Completed" (Completado)

#### `Task` (Estructura Base para Creación/Modificación)
```json
{
  "task_id": 1,
  "title": "Nombre de la Tarea",
  "status_task_id": 1,
  "position": 1,
  "sprint_id": 1,
  "date_end": "2026-05-22T19:00:00Z"
}
```

#### `TaskResponse` (Respuesta de Tareas)
```json
{
  "task_id": 1,
  "title": "Nombre de la Tarea",
  "description": "Descripción detallada (puede ser null)",
  "position": 1,
  "created_at": "2026-05-22T12:00:00Z",
  "updated_at": "2026-05-22T12:00:00Z",
  "statusTask": {
    "status_task_id": 1,
    "name": "Pending",
    "created_at": "2026-05-22T12:00:00Z",
    "updated_at": "2026-05-22T12:00:00Z"
  },
  "date_end": "2026-05-22T19:00:00Z" // o null
}
```

---

## 3. Endpoints Utilizados Actualmente por el Frontend

### 3.1 Autenticación y Registro
* **Login de Usuario**
  * **Ruta:** `POST /auth/login`
  * **Payload:** Objeto `Auth`
  * **Respuesta:** Objeto `LoginResponse` (incluyendo token JWT y datos de usuario + plan de suscripción).

* **Registro de Usuario**
  * **Ruta:** `POST /users`
  * **Payload:** Objeto `CreateUser`
  * **Respuesta:** Objeto `CreateUser` o datos del nuevo usuario creado.

### 3.2 Sprints
* **Listado de Sprints por Usuario**
  * **Ruta:** `GET /sprint/user/{userId}`
  * **Respuesta:** Arreglo `SprintResponse[]`

* **Crear Sprint**
  * **Ruta:** `POST /sprint`
  * **Payload:** Objeto `Sprint` sin ID.
  * **Respuesta:** Objeto `Sprint` creado (con su ID generado en la DB).

* **Actualizar Sprint**
  * **Ruta:** `PATCH /sprint/{id}`
  * **Payload:** Objeto parcial `Partial<Sprint>`
  * **Respuesta:** Objeto `Sprint` actualizado.

* **Eliminar Sprint**
  * **Ruta:** `DELETE /sprints/{id}`
  * **Nota de discrepancia:** El endpoint de eliminación en el frontend tiene una `s` en el path (`/sprints/`), a diferencia de `/sprint/` usado en creación/actualización. El backend debe soportar `/sprints/{id}`.

### 3.3 Tareas
* **Listado de Tareas por Sprint**
  * **Ruta:** `GET /tasks?sprint_id={sprintId}`
  * **Respuesta:** Arreglo `TaskResponse[]`

* **Crear Tarea**
  * **Ruta:** `POST /tasks`
  * **Payload:** Objeto `Task` (sin ID).
  * **Respuesta:** Objeto `Task` creado (con ID).

* **Actualizar Tarea**
  * **Ruta:** `PATCH /tasks/{id}`
  * **Payload:** Parcial `{ title?, status_task_id?, position?, date_end? }`
  * **Respuesta:** Objeto `TaskResponse` actualizado.
  * **Nota:** Utilizado tanto para reordenamiento (modifica `position`) como para transiciones de estado en el Kanban (modifica `status_task_id` y `date_end`).

* **Conteo de Tareas por Estado**
  * **GET /tasks/count-task-pending/{sprintId}** -> Retorna `number` (tareas con `status_task_id = 1`)
  * **GET /tasks/count-task-in-progress/{sprintId}** -> Retorna `number` (tareas con `status_task_id = 2`)
  * **GET /tasks/count-task-completed/{sprintId}** -> Retorna `number` (tareas con `status_task_id = 3`)

### 3.4 Inteligencia Artificial (Generación de Reportes Daily)
* **Generación de Reporte Daily usando LLM**
  * **Ruta:** `POST /ai-functions/generate`
  * **Payload:**
    ```json
    {
      "sprint_id": 123,
      "dateReport": "2026-05-21 15:30:00 GMT-5"
    }
    ```
  * **Respuesta:**
    ```json
    {
      "role": "assistant",
      "content": "Texto markdown generado por la IA con el resumen del progreso de las tareas...",
      "refusal": null,
      "annotations": []
    }
    ```

---

## 4. FUNCIONES PENDIENTES POR IMPLEMENTAR (Por el Backend)

Las siguientes funciones de la aplicación están actualmente **simuladas** en el frontend (escribiendo y leyendo únicamente del LocalStorage / Memoria) y necesitan que el backend provea los endpoints para que puedan funcionar de manera persistente:

### 4.1 Actualización de Perfil de Usuario
Actualmente, el componente `profile.ts` simula el guardado de la información personal de forma local. El backend necesita proveer la actualización del perfil.

* **Ruta Sugerida:** `PATCH /users/{id}` (o `PATCH /profile`)
* **Payload Esperado:**
  ```json
  {
    "full_name": "Nombre Editado",
    "email": "nuevo@correo.com",
    "profile_image": "data:image/png;base64,...", // Cadena Base64 o URL
    "role": "user", // "user" | "admin" | "manager"
    "subscription_plan_id": 1, // ID del plan actual
    "preferences": {
      "email_notifications": true,
      "dark_mode": true,
      "task_reminders": true
    }
  }
  ```
* **Comportamiento Requerido:**
  1. Validar que el correo no esté tomado por otro usuario.
  2. Procesar la imagen (si se recibe como Base64, almacenarla y guardar la URL).
  3. Guardar las preferencias (formato JSON en la tabla del usuario).
  4. Retornar el objeto de usuario actualizado (siguiendo el esquema de `LoginResponse.user`).

### 4.2 Cambio de Contraseña
Actualmente, `profile.ts` simula la acción en `changePassword()`.

* **Ruta Sugerida:** `POST /users/{id}/change-password` (o `POST /auth/change-password`)
* **Payload Esperado:**
  ```json
  {
    "current_password": "contraseña_actual",
    "new_password": "nueva_contraseña_segura"
  }
  ```
* **Comportamiento Requerido:**
  1. Validar que la contraseña actual (`current_password`) coincida con el hash de la DB del usuario.
  2. Encriptar la nueva contraseña (`new_password`) usando bcrypt/argon2 y guardarla.
  3. Retornar un mensaje de confirmación exitoso (`{ "message": "Password changed successfully" }`).

### 4.3 Compras y Gestión de Suscripciones (Stripe)
El frontend define tres planes: **Free** (gratuito, limitado), **Monthly** ($5.99/mes), y **Lifetime** ($59 de pago único). La landing page redirigirá a los flujos de pago.

* **Ruta 1: Crear Sesión de Pago (Checkout Session)**
  * **Ruta:** `POST /payments/create-checkout-session`
  * **Payload:** `{ plan_key: "monthly" | "lifetime" }`
  * **Comportamiento:** Genera una URL de Stripe Checkout para el usuario autenticado y la retorna (`{ "url": "https://checkout.stripe.com/..." }`).
* **Ruta 2: Webhook de Stripe (Procesamiento en segundo plano)**
  * **Ruta:** `POST /payments/webhook`
  * **Comportamiento:** Recibe eventos de Stripe como `checkout.session.completed` o `invoice.payment_succeeded`. Debe actualizar el campo `subscription_plan_id` del usuario correspondiente (2 para Monthly, 3 para Lifetime).
* **Ruta 3: Portal del Cliente (Stripe Billing Portal)**
  * **Ruta:** `POST /payments/customer-portal`
  * **Comportamiento:** Retorna la URL del portal de autoservicio de Stripe para que el usuario pueda cancelar o cambiar su tarjeta de crédito.

---

## 5. Propuesta de Base de Datos (Relacional - PostgreSQL/MySQL)

A continuación se sugiere el esquema DDL mínimo para estructurar la base de datos de forma que coincida exactamente con las llamadas del frontend:

```sql
-- 1. Tabla de Planes de Suscripción
CREATE TABLE subscription_plans (
    subscription_plan_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'monthly', 'lifetime'
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed de Planes Iniciales
INSERT INTO subscription_plans (subscription_plan_id, name, price, description) VALUES
(1, 'free', 0.00, 'Plan Gratuito: Límite de 2 sprints y 30 tareas.'),
(2, 'monthly', 5.99, 'Plan Mensual: Sprints y tareas ilimitadas.'),
(3, 'lifetime', 59.00, 'Plan de por vida: Acceso total permanente.');

-- 2. Tabla de Usuarios
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    profile_image TEXT,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin', 'manager'
    password VARCHAR(255) NOT NULL, -- Hash de bcrypt/argon2
    subscription_plan_id INT REFERENCES subscription_plans(subscription_plan_id) DEFAULT 1,
    preferences JSONB DEFAULT '{"email_notifications": true, "dark_mode": true, "task_reminders": true}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Sprints
CREATE TABLE sprints (
    sprint_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'active', 'completed'
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Estados de Tarea
CREATE TABLE status_tasks (
    status_task_id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed de Estados Obligatorios
INSERT INTO status_tasks (status_task_id, name) VALUES
(1, 'Pending'),
(2, 'In Progress'),
(3, 'Completed');

-- 5. Tabla de Tareas
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 1,
    status_task_id INT REFERENCES status_tasks(status_task_id) DEFAULT 1,
    sprint_id INT REFERENCES sprints(sprint_id) ON DELETE CASCADE,
    date_end TIMESTAMP, -- Se llena con la fecha actual cuando status_task_id pasa a 3 (Completed)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Lógica de Negocio Requerida (Límites por Plan)

El backend debe validar e imponer los siguientes límites de base de datos cuando reciba solicitudes de creación si el usuario pertenece al plan `free` (ID 1):

1. **Límite de Sprints (Plan Free):**
   * Al hacer `POST /sprint`, verificar si el usuario tiene **más de 2 sprints** en total. Si los tiene, denegar con error `403 Forbidden` informando que ha alcanzado el límite.
2. **Límite de Tareas (Plan Free):**
   * Al hacer `POST /tasks`, verificar si la suma de tareas en todos los sprints de este usuario llega a **30**. Si se alcanza, denegar con `403 Forbidden`.
