/**
 * Provincias y cantones de Ecuador (24 provincias, división administrativa INEC).
 * Uso: listas desplegables en formularios (Destinatario Final, etc.).
 */

export interface ProvinciaCanton {
  provincia: string;
  cantones: string[];
}

export const PROVINCIAS_CANTONES_ECUADOR: ProvinciaCanton[] = [
  { provincia: 'Azuay', cantones: ['Cuenca', 'Girón', 'Gualaceo', 'Nabón', 'Paute', 'Pucará', 'San Fernando', 'Santa Isabel', 'Sígsig', 'Sevilla de Oro', 'El Pan', 'Chordeleg', 'Guachapala', 'Camilo Ponce Enríquez', 'Oña'] },
  { provincia: 'Bolívar', cantones: ['Guaranda', 'Chillanes', 'Chimbo', 'Echeandía', 'San Miguel', 'Caluma', 'Las Naves'] },
  { provincia: 'Cañar', cantones: ['Azogues', 'Biblián', 'Cañar', 'Déleg', 'El Tambo', 'La Troncal', 'Suscal'] },
  { provincia: 'Carchi', cantones: ['Tulcán', 'Bolívar', 'Espejo', 'Mira', 'Montúfar', 'San Pedro de Huaca'] },
  { provincia: 'Chimborazo', cantones: ['Riobamba', 'Alausí', 'Colta', 'Chambo', 'Chunchi', 'Guamote', 'Guano', 'Pallatanga', 'Penipe', 'Cumandá'] },
  { provincia: 'Cotopaxi', cantones: ['Latacunga', 'La Maná', 'Pangua', 'Pujilí', 'Salcedo', 'Saquisilí', 'Sigchos'] },
  { provincia: 'El Oro', cantones: ['Machala', 'Arenillas', 'Atahualpa', 'Balsas', 'Chilla', 'El Guabo', 'Huaquillas', 'Las Lajas', 'Marcabelí', 'Pasaje', 'Piñas', 'Portovelo', 'Santa Rosa', 'Zaruma'] },
  { provincia: 'Esmeraldas', cantones: ['Esmeraldas', 'Eloy Alfaro', 'Muisne', 'Quinindé', 'Rioverde', 'San Lorenzo', 'Atacames'] },
  { provincia: 'Galápagos', cantones: ['San Cristóbal', 'Isabela', 'Santa Cruz'] },
  { provincia: 'Guayas', cantones: ['Guayaquil', 'Alfredo Baquerizo Moreno', 'Balao', 'Balzar', 'Colimes', 'Coronel Marcelino Maridueña', 'Daule', 'Durán', 'El Empalme', 'El Triunfo', 'General Antonio Elizalde', 'Isidro Ayora', 'Lomas de Sargentillo', 'Milagro', 'Naranjal', 'Naranjito', 'Nobol', 'Palestina', 'Pedro Carbo', 'Playas', 'Salitre', 'Samborondón', 'San Jacinto de Yaguachi', 'Santa Lucía', 'Simón Bolívar'] },
  { provincia: 'Imbabura', cantones: ['Ibarra', 'Antonio Ante', 'Cotacachi', 'Otavalo', 'Pimampiro', 'San Miguel de Urcuquí'] },
  { provincia: 'Loja', cantones: ['Loja', 'Calvas', 'Catamayo', 'Celica', 'Chaguarpamba', 'Espíndola', 'Gonzanamá', 'Macará', 'Olmedo', 'Paltas', 'Pindal', 'Puyango', 'Quilanga', 'Saraguro', 'Sozoranga', 'Zapotillo'] },
  { provincia: 'Los Ríos', cantones: ['Babahoyo', 'Baba', 'Buena Fe', 'Mocache', 'Montalvo', 'Palenque', 'Puebloviejo', 'Quevedo', 'Quinsaloma', 'Urdaneta', 'Valencia', 'Ventanas', 'Vinces'] },
  { provincia: 'Manabí', cantones: ['Portoviejo', 'Bolívar', 'Chone', 'El Carmen', 'Flavio Alfaro', 'Jama', 'Jaramijó', 'Jipijapa', 'Junín', 'Manta', 'Montecristi', 'Olmedo', 'Paján', 'Pedernales', 'Pichincha', 'Puerto López', 'Rocafuerte', 'San Vicente', 'Santa Ana', 'Sucre', 'Tosagua', 'Veinticuatro de Mayo'] },
  { provincia: 'Morona Santiago', cantones: ['Morona', 'Gualaquiza', 'Huamboya', 'Limón Indanza', 'Logroño', 'Pablo Sexto', 'Palora', 'San Juan Bosco', 'Santiago', 'Sucúa', 'Taisha', 'Tiwintza', 'Sevilla Don Bosco'] },
  { provincia: 'Napo', cantones: ['Tena', 'Archidona', 'Carlos Julio Arosemena Tola', 'El Chaco', 'Quijos'] },
  { provincia: 'Orellana', cantones: ['Francisco de Orellana', 'Aguarico', 'La Joya de los Sachas', 'Loreto'] },
  { provincia: 'Pastaza', cantones: ['Pastaza', 'Arajuno', 'Mera', 'Santa Clara'] },
  { provincia: 'Pichincha', cantones: ['Quito', 'Cayambe', 'Mejía', 'Pedro Moncayo', 'Pedro Vicente Maldonado', 'Puerto Quito', 'Rumiñahui', 'San Miguel de Los Bancos'] },
  { provincia: 'Santa Elena', cantones: ['Santa Elena', 'La Libertad', 'Salinas'] },
  { provincia: 'Santo Domingo de los Tsáchilas', cantones: ['Santo Domingo', 'La Concordia'] },
  { provincia: 'Sucumbíos', cantones: ['Lago Agrio', 'Cascales', 'Cuyabeno', 'Gonzalo Pizarro', 'Putumayo', 'Shushufindi', 'Sucumbíos'] },
  { provincia: 'Tungurahua', cantones: ['Ambato', 'Baños de Agua Santa', 'Cevallos', 'Mocha', 'Patate', 'Pelileo', 'Píllaro', 'Quero', 'Tisaleo'] },
  { provincia: 'Zamora Chinchipe', cantones: ['Zamora', 'Centinela del Cóndor', 'Chinchipe', 'El Pangui', 'Nangaritza', 'Palanda', 'Paquisha', 'Yacuambi', 'Yantzaza'] },
];

/** Lista plana de nombres de provincia para el select de provincia */
export const PROVINCIAS_ECUADOR = PROVINCIAS_CANTONES_ECUADOR.map((p) => p.provincia).sort((a, b) => a.localeCompare(b));

/**
 * Obtiene los cantones de una provincia.
 */
export function getCantonesByProvincia(provincia: string): string[] {
  const found = PROVINCIAS_CANTONES_ECUADOR.find(
    (p) => p.provincia.toLowerCase() === provincia.toLowerCase()
  );
  return found ? [...found.cantones].sort((a, b) => a.localeCompare(b)) : [];
}
