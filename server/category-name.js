export const categoryKey=name=>name.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
