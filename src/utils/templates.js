function renderTemplate(template, context) {
  if (!template) return '';
  return template
    .replaceAll('{user}', context.user || '')
    .replaceAll('{tag}', context.tag || '')
    .replaceAll('{mention}', context.mention || '')
    .replaceAll('{server}', context.server || '')
    .replaceAll('{memberCount}', context.memberCount != null ? String(context.memberCount) : '');
}

module.exports = { renderTemplate };


