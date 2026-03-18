export function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const getCurrentSeason = (): number => new Date().getFullYear();

export const getDriverDisplayName = (driver: { firstName: string; lastName: string; firstNameCn?: string; lastNameCn?: string }): string => {
  if (driver.firstNameCn && driver.lastNameCn) {
    return `${driver.lastNameCn}${driver.firstNameCn}`;
  }

  return `${driver.firstName} ${driver.lastName}`;
};

export const getTeamDisplayName = (team: { name: string; fullName?: string; nameCn?: string } | null | undefined): string => {
  if (!team) {
    return 'Unknown Team';
  }

  if (team.nameCn) {
    return team.nameCn;
  }

  if (team.fullName) {
    return team.fullName;
  }

  return team.name || 'Unknown Team';
};
