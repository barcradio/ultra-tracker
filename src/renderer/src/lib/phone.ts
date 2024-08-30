export const formatPhone = (phone: number) => {
  const phoneString = phone.toString();
  if (phoneString.length === 11) {
    return phoneString.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "+$1 ($2) $3-$4");
  }
  return phoneString.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
};
