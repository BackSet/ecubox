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
2. **Los cuatro estados por punto** (a veces llamados hitos operativos): qué estado del listado corresponde a cada momento automático del sistema:
   - cuando se **registra** un paquete;
   - cuando entra por **lote de recepción**;
   - cuando está **en despacho**;
   - el estado de **en tránsito** (también ligado a acciones masivas por periodo, como verás más abajo).

**Qué debes recordar tú como operador:** esos **cuatro** están pensados para que los aplique **el sistema** en los procesos correctos. No los busques para cambiarlos “a mano” desde la pantalla de **Estados de paquetes** (la barra lateral): allí **no se ofrecen** a propósito, para no duplicar lo que ya hace el flujo automático.

---

## 5. Cómo cambia el estado sin usar “Estados de paquetes”

Muchas veces el estado **cambia solo** cuando haces otra tarea habitual. Orden típico:

| Qué ocurre en la operación | Qué suele pasar con el estado |
|----------------------------|-------------------------------|
| **Registras** un paquete nuevo | Se aplica el estado configurado para “al registrar paquete”. |
| El paquete **entra por un lote de recepción** (según el proceso con guía de envío en lote) | Se aplica el estado configurado para “lote de recepción”. |
| **Asocias el paquete a un despacho** (lo pones en una saca / despacho) | Se aplica el estado configurado para “en despacho”. |
| En la lista de **Despachos** usas **Aplicar estado por periodo** | Según la propia pantalla, se aplica el estado definido en Parámetros como **“Estado en tránsito”** a los paquetes de los despachos cuya fecha cae en el rango de fechas que indicas. |

Es decir: **registro, lote, despacho y tránsito por periodo** son caminos donde el sistema aplica el estado que dejaron configurado en **Parámetros → Estados por punto**. Tu trabajo es hacer bien el registro, el lote o el despacho; el estado viene detrás.

---

## 6. Barra lateral: “Estados de paquetes”

En el grupo **Operaciones** del menú lateral verás **Estados de paquetes** (el nombre puede mostrarse como “Estados de paquetes” según tu pantalla).

### Para qué sirve

Sirve para **cambiar el estado a mano** cuando el paquete **aún no está en un despacho** (no tiene saca asignada). Es el sitio adecuado para pasar el envío a **otros estados del catálogo** que **no** sean los cuatro reservados para los procesos automáticos (registro, lote, despacho, tránsito configurado en Parámetros). En otras palabras: aquí gestionas situaciones **no cubiertas** por esos hitos automáticos, por ejemplo etapas intermedias o casos especiales que tu empresa definió como estados aparte.

### Qué verás

- Una lista de paquetes que cumplen la condición **sin despacho / sin saca**.
- Casillas para **seleccionar** uno o varios paquetes.
- Un **desplegable** con el estado al que quieres pasarlos y un botón para **aplicar** el cambio a los seleccionados.

### Mensajes de ayuda que verás en pantalla (resumen)

- Solo aparecen paquetes **sin despacho**. Si un paquete ya fue a despacho, **no estará en esta lista**; no podrás moverlo desde aquí.
- Los paquetes que estén en un **lote de recepción** pueden **rechazarse** al aplicar el cambio; el sistema te dirá cuáles y por qué.
- El desplegable **no ofrece** los estados configurados en **Parámetros → Estados de rastreo por punto** (los cuatro: registro, lote, despacho, tránsito), porque esos los asignan los flujos correspondientes.
- Si seleccionas **varios** paquetes a la vez, solo verás estados que sean **válidos para todos** los seleccionados a la vez (pueden ser menos opciones que si eliges uno solo).

---

## 7. Qué hace esta pantalla y qué no

| Sí hace | No hace |
|--------|---------|
| Cambiar estado de forma **manual** para paquetes **sin saca**, usando estados del catálogo **que no sean** los cuatro “por punto”. | Sustituir el **registro** de paquetes, los **lotes** ni los **despachos**. |
| Trabajar con **varios** paquetes seleccionados. | Mostrar paquetes que **ya van en despacho** (con saca). |
| Respetar reglas del sistema (rechazos, lista de destinos permitidos). | Forzar los cuatro estados reservados para procesos automáticos. |

Si necesitas que el paquete pase por “registro”, “lote”, “despacho” o el tránsito masivo por periodo, lo correcto es usar **esas** operaciones (registro, lote, despacho, **Aplicar estado por periodo** en despachos), no esta pantalla.

---

## 8. Otras pantallas: ver el estado, no cambiarlo masivamente aquí

- **Paquetes** (lista “Mis paquetes”): muestra el **estado actual** de cada paquete; sirve para registrar, buscar y otras acciones según tu cuenta. El cambio masivo pensado para paquetes **sin saca** está en **Estados de paquetes**.
- **Detalle de un despacho**: verás el estado de los paquetes en ese despacho; el movimiento principal de estado hacia “en despacho” o el tránsito por periodo viene de los flujos de despacho y de Parámetros, no de la pantalla de Estados de paquetes.

---

## 9. Tabla resumen

| Situación | Cómo suele cambiar el estado | Dónde en el menú |
|-----------|------------------------------|------------------|
| Nuevo paquete | Automático al registrar | **Paquetes** (registrar) + configuración en **Parámetros** |
| Entrada por lote de recepción | Automático según lote | **Lotes de recepción** |
| Paquete va a un despacho | Automático al asociarlo | **Despachos** |
| Tránsito / periodo para muchos paquetes | Acción masiva por fechas | **Despachos** → **Aplicar estado por periodo** |
| Cambio manual a otro estado (sin saca) | Tú eliges el estado en el desplegable | **Operaciones** → **Estados de paquetes** |
| Ver estado como cliente | Solo consulta | Página pública **Rastreo** |

---

## 10. Preguntas frecuentes

**No veo un paquete en “Estados de paquetes”.**  
Probablemente **ya tiene saca / despacho**. Esa pantalla solo lista envíos **sin despacho**. Para los que ya van en camión o consolidación, el estado se mueve con el flujo de despacho o con la acción por periodo, no desde aquí.

**No aparece un estado en el desplegable.**  
Puede ser un estado **reservado** para los cuatro hitos de Parámetros (no se ofrece aquí). También puede pasar si eliges **varios** paquetes y solo algunos estados aplican a **todos** a la vez.

**¿Puedo poner el mismo estado que “en tránsito” desde Estados de paquetes?**  
No debería ofrecerse el que está configurado como tránsito en **Estados por punto**, porque ese lo gestiona el sistema en sus procesos. Si algo no cuadra, revisa con quien administra **Parámetros**.

**El cliente ¿dónde ve el estado?**  
En **Rastreo**, con el número de guía, según las reglas de visibilidad que definan los estados en el sistema (ver sección 2 y 3 de esta guía).

**En Rastreo no veo el plazo de retiro ni la cuenta regresiva.**  
Suele ser porque el paquete **aún no** está en un despacho con tipo de entrega y días configurados, o porque no aplica plazo en ese momento. Cuando corresponda, aparecerán “Días transcurridos” y “Días restantes para retiro”.

**¿Desde qué fecha cuenta el plazo?**  
Desde la **fecha en que comenzó el estado actual** del paquete (no desde el alta inicial del envío, salvo que coincidan).

---

## Anexo: rutas por si tu equipo usa enlaces directos

Solo referencia técnica mínima; puedes ignorar este bloque si no lo necesitas.

| Pantalla | Ruta aproximada |
|----------|-----------------|
| Panel inicio | `/inicio` |
| Estados de paquetes | `/gestionar-estados-paquetes` |
| Parámetros | `/parametros-sistema` |
| Despachos | `/despachos` |
| Rastreo público | `/tracking` |

---

## Más detalle en el manual general

Para permisos de cuenta, roles y recorrido completo de todos los módulos, consulta el documento **[Manual de usuario](MANUAL_USUARIO.md)** (carpeta **Usuario** en la documentación).

Esta guía explica el **estado del paquete**, **dónde** actúas en el panel, **cómo ve el cliente el Rastreo** (incluido cuando no hay plazo de retiro) y **cómo se calculan los días para retiro**, en lenguaje cotidiano.
