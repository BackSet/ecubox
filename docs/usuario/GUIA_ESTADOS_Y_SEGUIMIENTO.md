# Guía: estados de paquete y seguimiento en ECUBOX
---

## 1. Para quién es esta guía

Es para **personas que trabajan en el día a día** con paquetes en ECUBOX: operadores, personal de bodega o despacho, y quienes supervisan el recorrido de los envíos. Si quieres saber **en qué etapa va un paquete**, **quién mueve ese “estado”** y **en qué pantalla debes actuar**, aquí está la idea clara.

---

## 2. Qué significa “estado” en ECUBOX

El **estado** es la **etiqueta** que dice en qué punto del camino está un envío: por ejemplo que está en bodega, en tránsito, en despacho, etc. Esa etiqueta:

- La puede ver el **cliente** en la página de **Rastreo** (con el número de guía).
- Tú la ves en el **panel** en listas de paquetes, en despachos y en la pantalla dedicada a gestionar estados.

El estado **no es** el peso ni la guía: es **la fase** del proceso que la empresa definió en el sistema.

### Cómo ve el cliente la información en **Rastreo**

Cualquier persona puede abrir la página de **Rastreo** (desde la web pública), escribir el **número de guía** y consultar. No hace falta iniciar sesión.

**Qué suele aparecer en pantalla**

- Un **resumen** con el estado actual del envío y, si aplica, texto aclaratorio (**leyenda**) asociado a ese estado.
- El bloque **Flujo del envío**: una línea de tiempo con los pasos del recorrido. Los pasos “normales” siguen la secuencia configurada por la empresa. Las **novedades informativas** (estados de tipo alterno) solo se muestran **cuando realmente aplican** a ese envío, para no llenar la pantalla de pasos que no corresponden.
- Tarjetas con datos útiles según el caso: despacho, saca, datos de entrega (domicilio, agencia, etc.), cuando el sistema los tenga.

**Si un estado “no es visible” en el rastreo público**

En **Parámetros**, cada estado puede marcarse como visible o no para el tracking. La regla práctica es:

- Los estados **no marcados como visibles** **no** aparecen en la lista del flujo **mientras el paquete no esté en ellos**.
- El estado en el que el paquete **está ahora mismo** **sí se muestra siempre** en el resumen y en la línea de tiempo, para que el cliente sepa en qué etapa va aunque ese nombre no se hubiera listado antes como paso público.

Así se evita mostrar etapas internas que la empresa prefiere ocultar, sin dejar al cliente sin saber **cuál es su situación actual**.

**Si no hay nada que mostrar en el flujo**

En casos extremos (por ejemplo, sin estados configurados para dibujar el recorrido), la pantalla puede indicar que no hay estados para mostrar el flujo. Eso depende de cómo esté armado el catálogo en el sistema.

---

## 3. Plazos de retiro y “cuenta regresiva” en Rastreo

En la misma página de Rastreo, el bloque **Progreso y plazos** puede mostrar información sobre el tiempo para **retirar** el paquete cuando aplica.

### Cuándo **sí** hay plazo y cuenta regresiva

El sistema solo puede calcular **días máximos de retiro** cuando el paquete **ya va asociado a un despacho** (tiene saca y despacho) y ese despacho tiene definido un **tipo de entrega** (por ejemplo domicilio, agencia ECUBOX o punto de entrega del courier). Según ese tipo, el plazo sale de los datos del **courier de entrega**, la **agencia** o el **punto de entrega** que correspondan.

A partir de ahí:

- **Días transcurridos**: cuántos días naturales han pasado **desde que el paquete entró en su estado actual** (la cuenta arranca en esa fecha, no necesariamente desde que se registró el envío por primera vez).
- **Días restantes para retiro**: cuántos días quedan dentro del plazo máximo permitido, restando los ya transcurridos. Es la idea de “cuenta regresiva” hacia el límite para retirar.
- El cálculo usa la **fecha calendario en Ecuador** (zona horaria del país) para ser coherente con el negocio local.

Cuando los días restantes llegan a **cero**, la interfaz puede indicar que **el periodo de espera ya se cumplió** (es decir, se alcanzó el plazo máximo configurado).

### Cuándo **no** hay plazo ni cuenta regresiva

Si el envío **aún no** está en un despacho con esa información (por ejemplo, sin saca, o sin tipo de entrega que defina días), el bloque de plazos explica que **este envío no tiene un plazo máximo de retiro configurado**. No es un error: simplemente **no aplica** ese cómputo hasta que existan los datos de entrega necesarios.

### Leyendas con “días”

Algunas leyendas del estado pueden usar un texto tipo “llevas X días…”: en esos casos, el número que ves suele alinearse con los **días transcurridos** en el estado actual, para que el mensaje coincida con lo que muestra el recuento.

---

## 4. Quién pone los nombres de los estados y los “hitos” automáticos

En el menú lateral, bajo **Configuración**, está **Parámetros**. Allí suelen entrar **administradores** para dos cosas relacionadas con estados:

1. **El listado de estados** (cómo se llaman, en qué orden aparecen en el rastreo, cuáles son “normales” y cuáles “alternos”, etc.).
2. **Los estados por punto** (hitos operativos), organizados en **cuatro grupos** en la pestaña **Estados por punto**:
   - **Paquetes:** registro, asociar a consolidado, lote de recepción, asociar guía master, salida de origen (USA), llegada a destino (aduana), en despacho, avance masivo, aviso de confirmación de entrega, entrega confirmada por cliente, anclas de cuenta regresiva.
   - **Guías master:** los diez estados globales (`EN_ESPERA_RECEPCION`, `EN_TRANSITO_USA_ECUADOR`, recepción, despacho, etc.) usados al recalcular la guía.
   - **Consolidados:** etiquetas operativas derivadas (`VACIO`, `EN_PREPARACION`, `ENVIADO_DESDE_USA`, `RECIBIDO_EN_BODEGA`, `LIQUIDADO`) para la UI de Parámetros.
   - **Tracking:** inicio y fin de cuenta regresiva (anclas de cálculo, no cambian el estado del paquete por sí solas).

   Detonadores principales de paquete (ver tabla canónica en [Detonadores por estado](DETONADORES_POR_ESTADO.md)):
   - **Registro** de paquete;
   - **Asociar a envío consolidado** (estado típico: `PLANILLA`);
   - **Asociar a guía master**;
   - **Salida de origen** (enviar consolidado desde USA);
   - **Llega a destino** y **lote de recepción** (dos pasos al procesar el lote);
   - **En despacho** y **avance masivo por despacho**;
   - **Aviso de confirmación** (push al cliente) y **entrega confirmada** (Mis entregas).

**Qué debes recordar tú como operador:** esos puntos los aplica **el sistema** en los procesos correctos. No los busques para cambiarlos “a mano” desde **Estados de paquetes**: allí **no se ofrecen** a propósito.

---

## 5. Cómo cambia el estado sin usar “Estados de paquetes”

Muchas veces el estado **cambia solo** cuando haces otra tarea habitual. Orden típico:

| Qué ocurre en la operación | Qué suele pasar con el estado |
|----------------------------|-------------------------------|
| **Registras** un paquete nuevo | Se aplica el estado configurado para “cuando se registra el paquete”. |
| **Agregas el paquete a un envío consolidado** | Se aplica el estado de “asociar a envío consolidado” (típicamente `PLANILLA`). |
| El paquete **entra por un lote de recepción** | Al **procesar** el lote se aplican en secuencia “llega a destino” (`LLEGA_A_ADUANA`) y “en lote” (`EN_BODEGA`). |
| **Asocias el paquete a una guía master** | Se aplica el estado configurado para “cuando se asocia a guía master”. |
| **Marcas como enviado desde USA** el consolidado que contiene al paquete | Se aplica el estado configurado para “cuando sale de origen”; la guía master puede pasar a **En tránsito USA-Ecuador** hasta que entre a recepción. |
| **Asocias el paquete a un despacho** (lo pones en una saca / despacho) | Se aplica el estado configurado para “cuando se agrega a despacho”. |
| En la lista de **Despachos** usas **Aplicar estado por periodo** o **Aplicar estado a despachos** | Se aplica el estado de **avance masivo por despacho** (típicamente `EN_TRANSITO`). |
| El paquete alcanza el estado de **aviso de confirmación** | El cliente recibe un push “¿Recibiste tu envío?” con enlace a **Mis entregas**. |
| El **cliente confirma** su entrega en **Mis entregas** | Se aplica el estado de entrega confirmada (típicamente `ENTREGADO`). |

Es decir: **registro, consolidado, lote, guía master, salida USA, despacho, avance masivo y confirmación del cliente** son caminos automáticos configurados en **Parámetros → Estados por punto**.

---

## 6. Barra lateral: “Gestionar estados”

En el grupo **Operación** del menú lateral verás **Gestionar estados**. Es un **hub con tres pestañas**, una por cada dominio de estado. Solo verás las pestañas para las que tengas permiso, y **cambiar de pestaña limpia la selección** (no se mezclan entidades).

### Pestaña 1 — Paquetes

Cambia el estado **a mano** de paquetes **sin despacho** (sin saca).

- Lista de paquetes **sin despacho** con casillas para **seleccionar** uno o varios.
- El **desplegable** de estado **solo ofrece los destinos válidos** para **toda** la selección: el sistema (backend) calcula la intersección, así que si eliges varios paquetes verás solo los estados aplicables a todos a la vez.
- **No ofrece** los estados reservados a los **estados por punto** (registro, consolidado, lote, guía master, salida USA, llegada a destino, despacho, avance masivo, aviso/confirmación de entrega).
- Los paquetes con restricciones (en lote, etc.) pueden **rechazarse**; el sistema te dirá cuáles y por qué.

### Pestaña 2 — Guías master

Aplica **acciones manuales** sobre guías master (no estados arbitrarios). Según el estado de las guías seleccionadas, se habilitan:

| Acción | Cuándo se ofrece |
|--------|------------------|
| **Recalcular estado** | Guías no congeladas (no terminales ni en revisión). |
| **Marcar en revisión** | Guías no terminales y que no estén ya en revisión. |
| **Salir de revisión** | Todas las seleccionadas están **en revisión**. |
| **Cancelar** | Ninguna terminal (requiere **motivo**). |

### Pestaña 3 — Consolidados

Aplica **transiciones operativas** del envío consolidado:

| Transición | Cuándo se ofrece |
|------------|------------------|
| **Enviar desde USA** | El consolidado está **En preparación** (abierto, con piezas, sin pagar). |
| **Reabrir (En preparación)** | El consolidado está **Enviado desde USA** (cerrado, sin pagar). |

Los estados **derivados** no se cambian aquí: si está **Vacío** agrega piezas; si está **Recibido en bodega** se gestiona en **Lotes de recepción**; si está **Liquidado** se gestiona en **Liquidaciones**. La pantalla muestra un texto de ayuda cuando la selección no admite transición manual.

---

## 7. Qué hace esta pantalla y qué no

| Sí hace | No hace |
|--------|---------|
| Cambiar estado de forma **manual** para paquetes **sin saca**, usando estados del catálogo **que no sean** los “por punto”. | Sustituir el **registro** de paquetes, los **lotes** ni los **despachos**. |
| Trabajar con **varios** paquetes seleccionados. | Mostrar paquetes que **ya van en despacho** (con saca). |
| Respetar reglas del sistema (rechazos, lista de destinos permitidos). | Forzar los estados reservados para procesos automáticos. |

Si necesitas que el paquete pase por “registro”, “lote”, “guía master”, “despacho” o el avance masivo por despacho, lo correcto es usar **esas** operaciones (registro, lote, despacho, **Aplicar estado por periodo** en despachos), no esta pantalla.

---

## 8. Otras pantallas: ver el estado, no cambiarlo masivamente aquí

- **Paquetes** (`/paquetes`): muestra el **estado actual** y el **estado operativo del consolidado** (si aplica). El cambio masivo para paquetes **sin saca** está en **Estados de paquetes**.
- **Envíos consolidados** (`/envios-consolidados`): agrupa piezas para manifiestos; el estado operativo derivado puede ser `VACIO`, `EN_PREPARACION`, `ENVIADO_DESDE_USA`, `RECIBIDO_EN_BODEGA` o `LIQUIDADO`. El pago (`NO_PAGADO` / `PAGADO`) es independiente del avance logístico.
- **Guías master** (`/guias-master`): estado global recalculado desde conteos de piezas (`EN_TRANSITO_USA_ECUADOR`, recepción, despacho, etc.).
- **Mis entregas** (`/mis-entregas`, vista cliente): lista despachos con las piezas del cliente. Cuando el paquete está en el estado de **aviso de confirmación** (o posterior, sin haber confirmado), el despacho aparece como **confirmable** y el cliente puede marcar **Confirmar entrega**.
- **Detalle de un despacho**: el estado “en despacho” y el avance masivo vienen de los flujos de despacho, no de Estados de paquetes.

---

## 9. Tabla resumen

| Situación | Cómo suele cambiar el estado | Dónde en el menú |
|-----------|------------------------------|------------------|
| Nuevo paquete | Automático al registrar | **Paquetes** (registrar) + **Parámetros** |
| En planilla (consolidado) | Automático al agregar a consolidado | **Envíos consolidados** |
| Entrada por lote de recepción | Automático al procesar lote (aduana + bodega) | **Lotes de recepción** |
| Salida de USA | Automático al enviar consolidado desde USA | **Envíos consolidados** |
| Confirmación del cliente | Automático al confirmar en Mis entregas | **Mis entregas** (cliente) |
| Paquete va a un despacho | Automático al asociarlo | **Despachos** |
| Avance masivo por despacho | Acción masiva por fechas o por despachos seleccionados | **Despachos** → **Aplicar estado por periodo** / **a despachos** |
| Cambio manual a otro estado (sin saca) | Tú eliges el estado en el desplegable | **Operaciones** → **Estados de paquetes** |
| Ver estado como cliente | Solo consulta | Página pública **Rastreo** |

---

## 10. Preguntas frecuentes

**No veo un paquete en “Estados de paquetes”.**  
Probablemente **ya tiene saca / despacho**. Esa pantalla solo lista envíos **sin despacho**. Para los que ya van en camión o consolidación, el estado se mueve con el flujo de despacho o con la acción por periodo, no desde aquí.

**No aparece un estado en el desplegable.**  
Puede ser un estado **reservado** para los hitos por punto de Parámetros (no se ofrece aquí). También puede pasar si eliges **varios** paquetes y solo algunos estados aplican a **todos** a la vez.

**¿Puedo poner desde Estados de paquetes el mismo estado del avance masivo por despacho?**  
No debería ofrecerse el que está configurado para el avance masivo por despacho en **Estados por punto**, porque ese lo gestiona el sistema en sus procesos. Si algo no cuadra, revisa con quien administra **Parámetros**.

**El cliente ¿dónde ve el estado?**  
En **Rastreo**, con el número de guía, según las reglas de visibilidad que definan los estados en el sistema (ver sección 2 y 3 de esta guía).

**En Rastreo no veo el plazo de retiro ni la cuenta regresiva.**  
Suele ser porque el paquete **aún no** está en un despacho con tipo de entrega y días configurados, o porque no aplica plazo en ese momento. Cuando corresponda, aparecerán “Días transcurridos” y “Días restantes para retiro”.

**¿Desde qué fecha cuenta el plazo?**  
Desde la **fecha en que comenzó el estado actual** del paquete (no desde el alta inicial del envío, salvo que coincidan).

**¿Por qué el cliente recibió un push para confirmar entrega?**  
Porque sus piezas alcanzaron el estado configurado como **aviso de confirmación** (típicamente `EN_TRANSITO`). El push lleva a **Mis entregas**.

**¿Puede el operario marcar Entregado si el cliente no confirmó?**  
Sí, si `ENTREGADO` sigue disponible en **Estados de paquetes** (cambio manual). La confirmación del cliente es un camino adicional, no excluyente.

**¿Un consolidado liquidado deja de ser recepcionable?**  
No necesariamente. El listado de consolidados disponibles para recepción ignora el pago: un consolidado `LIQUIDADO` sigue recepcionable hasta que su código figure en un lote.

---

## Anexo: rutas por si tu equipo usa enlaces directos

Solo referencia técnica mínima; puedes ignorar este bloque si no lo necesitas.

| Pantalla | Ruta aproximada |
|----------|-----------------|
| Panel inicio | `/inicio` |
| Estados de paquetes | `/gestionar-estados-paquetes` |
| Parámetros | `/parametros-sistema` |
| Despachos | `/despachos` |
| Envíos consolidados | `/envios-consolidados` |
| Guías master | `/guias-master` |
| Mis entregas (cliente) | `/mis-entregas` |
| Rastreo público | `/tracking` |

---

## Más detalle en el manual general

Para permisos de cuenta, roles y recorrido completo de todos los módulos, consulta el documento **[Manual de usuario](MANUAL_USUARIO.md)** (carpeta **Usuario** en la documentación).

Esta guía explica el **estado del paquete**, **dónde** actúas en el panel, **cómo ve el cliente el Rastreo** (incluido cuando no hay plazo de retiro) y **cómo se calculan los días para retiro**, en lenguaje cotidiano.
# Gestión manual y estados automáticos

Los estados configurados en **Estados por punto** se aplican exclusivamente desde
sus detonantes operativos y no aparecen en los selectores de cambio manual.
Guías master y consolidados usan estados definidos por el sistema; el administrador
puede consultarlos, pero no cambiar su mapeo. Las acciones manuales permitidas son:

- Guías master: cancelar, marcar o salir de revisión y recalcular.
- Consolidados: enviar desde USA y reabrir a En preparación.
