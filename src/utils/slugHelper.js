function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+/, '') // Remover guiones al inicio
    .replace(/-+$/, '') // Remover guiones al final
    .replace(/--+/g, '-'); // Reemplazar múltiples guiones con uno solo
}

module.exports = {
  generateSlug,
};