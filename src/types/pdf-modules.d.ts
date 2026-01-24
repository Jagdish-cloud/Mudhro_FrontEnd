declare module "html2canvas" {
  const html2canvas: any;
  export default html2canvas;
}

declare module "jspdf" {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string | string[], compressPdf?: boolean);
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    addImage(...args: any[]): jsPDF;
    addPage(): jsPDF;
    save(filename?: string): void;
  }
}
