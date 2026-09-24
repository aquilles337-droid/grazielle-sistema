/** @type {import('next').NextConfig} */
const nextConfig = {
  // Upload da logo do escritório (até 1 MB) via Server Action
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // O @react-pdf/renderer é empacotado junto com a rota do PDF (não é marcado como
  // externo). Assim as fontes padrão do pdfkit (Helvetica etc.), que ele carrega por
  // import dinâmico, vão dentro do build — hospedagens que publicam só parte da
  // node_modules (ex.: Hostinger) davam "Cannot find module .../Helvetica.cjs".
  // Por garantia, os arquivos do pdfkit também entram no rastreamento de arquivos.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfkit/js/**/*"],
  },
};

export default nextConfig;
