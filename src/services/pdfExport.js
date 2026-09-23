import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReportPDF = (report) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 18;
  const cw = pw - m * 2;
  let y = 0;

  const checkPage = (h) => {
    if (y + h > ph - m) { doc.addPage(); y = m; drawFooter(doc, pw, ph); }
  };

  const drawFooter = (d, w, h) => {
    const tp = d.internal.getNumberOfPages();
    for (let i = 1; i <= tp; i++) {
      d.setPage(i);
      d.setFontSize(7); d.setTextColor(160);
      d.text(`IC Navigator |  Page ${i}/${tp}`, w / 2, h - 8, { align: 'center' });
    }
  };

  // Header
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pw, 45, 'F');
  doc.setTextColor(255); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text(`IC Report: ${report.identification.name}`, m, 22);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Part: ${report.identification.number}  |  ${report.identification.manufacturer}  |  ${new Date().toLocaleString()}`, m, 34);
  y = 58;

  // Identity
  doc.setTextColor(15, 118, 110); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('1. Component Identity', m, y); y += 8;
  doc.setTextColor(30); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Manufacturer: ${report.identification.manufacturer}`, m, y); y += 5;
  doc.text(`Family: ${report.identification.family}`, m, y); y += 5;
  doc.text(`Confidence: ${report.identification.confidence}%`, m, y); y += 10;

  // Tech specs
  doc.setTextColor(15, 118, 110); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('2. Technical Specifications', m, y); y += 4;
  autoTable(doc, {
    startY: y, head: [['#', 'Parameter', 'Value']],
    body: report.technicalProfile.map(s => [s.id, s.label, s.value]),
    theme: 'grid', headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    margin: { left: m, right: m }, styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 12;

  // Pinout
  checkPage(60);
  doc.setTextColor(15, 118, 110); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('3. Pin Topology', m, y); y += 6;
  doc.setFont('courier', 'normal'); doc.setFontSize(7.5); doc.setTextColor(50);
  report.pinout.diagram.split('\n').forEach(line => {
    checkPage(4); doc.text(line, m, y); y += 3.8;
  });
  y += 4;
  autoTable(doc, {
    startY: y, head: [['Pin', 'Name', 'Description']],
    body: report.pinout.table.map(p => [p.pin, p.name, p.description]),
    theme: 'striped', headStyles: { fillColor: [180, 83, 9], textColor: 255 },
    margin: { left: m, right: m }, styles: { fontSize: 8.5 },
  });
  y = doc.lastAutoTable.finalY + 12;

  // Diagnostics
  checkPage(50);
  doc.setTextColor(15, 118, 110); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('4. Diagnostics Protocol', m, y); y += 8;
  doc.setTextColor(30); doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
  doc.text(`Expected Voltages: ${report.testing.expectedVoltages}`, m, y); y += 6;
  report.testing.multimeter.forEach(t => { checkPage(5); doc.text(`• ${t}`, m + 3, y); y += 5; });
  y += 4;
  doc.setFont('helvetica', 'bold'); doc.text('Fault Symptoms:', m, y); y += 5;
  doc.setFont('helvetica', 'normal');
  report.testing.faultSymptoms.forEach(f => { checkPage(5); doc.text(`- ${f}`, m + 3, y); y += 5; });
  y += 10;

  // Market
  checkPage(50);
  doc.setTextColor(15, 118, 110); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('5. Market Analysis (India)', m, y); y += 8;
  doc.setTextColor(30); doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
  doc.text(`Range: ${report.marketPrice.minPrice} - ${report.marketPrice.maxPrice}  |  Trend: ${report.marketPrice.bulkTrend}`, m, y); y += 6;
  autoTable(doc, {
    startY: y, head: [['Retailer', 'Price (INR)', 'Availability']],
    body: report.marketPrice.indiaRetailers.map(r => [r.store, r.price, r.availability]),
    theme: 'grid', headStyles: { fillColor: [5, 150, 105], textColor: 255 },
    margin: { left: m, right: m }, styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 12;

  // Case Study
  checkPage(40);
  doc.setTextColor(15, 118, 110); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('6. Case Study', m, y); y += 8;
  doc.setTextColor(30); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(report.caseStudy.title, m, y); y += 6;
  const descLines = doc.splitTextToSize(report.caseStudy.description, cw);
  doc.text(descLines, m, y); y += descLines.length * 4.5 + 4;
  const outLines = doc.splitTextToSize(`Outcome: ${report.caseStudy.outcome}`, cw);
  doc.text(outLines, m, y); y += outLines.length * 4.5 + 10;

  // Use Cases
  checkPage(30);
  doc.setTextColor(15, 118, 110); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('7. Use Cases', m, y); y += 6;
  doc.setTextColor(30); doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
  report.useCases.forEach(uc => { checkPage(5); doc.text(`[+] ${uc}`, m + 3, y); y += 5; });

  drawFooter(doc, pw, ph);
  doc.save(`IC_Report_${report.identification.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateLabRecordPDF = (report) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20;
  let y = 62;

  // Pagination Logic for Lab Record
  const checkPage = (h) => {
    if (y + h > ph - m) { 
      doc.addPage(); 
      y = m; 
    }
  };

  // Header (Page 1 Only)
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pw, 50, 'F');
  doc.setTextColor(255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('IEM-UEM KOLKATA', pw / 2, 18, { align: 'center' });
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('Department of Electronics & Communication Engineering', pw / 2, 27, { align: 'center' });
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('LABORATORY RECORD', pw / 2, 40, { align: 'center' });

  doc.setTextColor(30); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Experiment:', m, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Identification and Analysis of ${report.identification.name} IC`, m + 30, y);
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.text('Date:', m, y);
  doc.setFont('helvetica', 'normal'); doc.text(new Date().toLocaleDateString(), m + 20, y);
  y += 12;

  checkPage(25);
  doc.setFont('helvetica', 'bold'); doc.text('Aim:', m, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const aimText = `To identify the ${report.identification.name} (${report.identification.number}) integrated circuit manufactured by ${report.identification.manufacturer}, analyze its pin configuration, verify electrical characteristics, and study its practical applications.`;
  const aimLines = doc.splitTextToSize(aimText, pw - m * 2);
  doc.text(aimLines, m, y);
  y += aimLines.length * 5 + 6;

  checkPage(30);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Components Required:', m, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`- ${report.identification.name} IC (1 no.)`, m, y); y += 5;
  doc.text('- Breadboard, connecting wires', m, y); y += 5;
  doc.text('- Multimeter, Oscilloscope', m, y); y += 5;
  doc.text(`- Power supply: ${report.testing.expectedVoltages}`, m, y); y += 12;

  checkPage(20);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Pin Configuration:', m, y); y += 6;
  doc.setFont('courier', 'normal'); doc.setFontSize(7);
  report.pinout.diagram.split('\n').forEach(line => { 
    checkPage(5); 
    doc.text(line, m, y); 
    y += 3.5; 
  });
  y += 8;

  checkPage(30);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Technical Specifications:', m, y); y += 4;
  autoTable(doc, {
    startY: y, head: [['Parameter', 'Value']],
    body: report.technicalProfile.map(s => [s.label, s.value]),
    theme: 'grid', headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    margin: { left: m, right: m }, styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 12;

  checkPage(15);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Procedure:', m, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  report.breadboardGuide.forEach((step, i) => {
    checkPage(10);
    const lines = doc.splitTextToSize(`${i + 1}. ${step}`, pw - m * 2 - 5);
    lines.forEach(line => { doc.text(line, m + 3, y); y += 4.5; });
    y += 2;
  });
  y += 8;

  checkPage(30);
  doc.setFont('helvetica', 'bold'); doc.text('Observations:', m, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Space for student observations and waveform sketches.', m, y); y += 20;

  checkPage(30);
  doc.setFont('helvetica', 'bold'); doc.text('Conclusion:', m, y); y += 6;
  doc.setFont('helvetica', 'normal');
  const conc = `The ${report.identification.name} IC was successfully identified and analyzed. Key findings confirm it belongs to the ${report.identification.family} family with ${report.identification.confidence}% confidence. ${report.caseStudy.outcome}`;
  const concLines = doc.splitTextToSize(conc, pw - m * 2);
  doc.text(concLines, m, y);

  // Print Footer on All Pages for Lab Record
  const tp = doc.internal.getNumberOfPages();
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(160);
    doc.text(`Generated by IC Navigator |  Page ${i}/${tp}`, pw / 2, ph - 10, { align: 'center' });
  }

  doc.save(`Lab_Record_${report.identification.name.replace(/\s+/g, '_')}.pdf`);
};