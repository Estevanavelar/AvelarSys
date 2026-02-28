export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Gera URL de login no App Portal com redirect de volta para o AxCellOS
// (mesmo padrão do StockTech)
export const getLoginUrl = () => {
  const portalUrl = "https://app.avelarcompany.com.br";
  
  const redirectUri = window.location.href;
  const url = new URL("/login", portalUrl);
  url.searchParams.set("redirect", redirectUri);

  return url.toString();
};
