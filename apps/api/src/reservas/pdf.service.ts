import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface ReservaRow {
  numero: string;
  nome: string;
  espaco: string;
  data: string;
  horaInicio?: number;
  duracaoHoras?: number;
  telefone: string;
}

@Injectable()
export class PdfService {
  generateReservasReport(reservas: any[]): Readable {
    const doc = new PDFDocument({ margin: 40 });

    // Título
    doc.fontSize(20).font('Helvetica-Bold').text('Relatório de Reservas', {
      align: 'center',
    });

    // Data do relatório
    doc.fontSize(10).font('Helvetica').text(
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      {
        align: 'center',
      },
    );

    doc.moveDown();

    // Cabeçalho da tabela
    const headerY = doc.y;
    const colWidths = {
      ap: 50,
      morador: 110,
      espaco: 90,
      data: 70,
      horario: 60,
      telefone: 90,
    };

    const headers = ['AP', 'Morador', 'Espaço', 'Data', 'Horário', 'Telefone'];
    let x = 40;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');

    // Background cinza para cabeçalho
    doc.rect(40, headerY, 540, 20).fill('#333333');

    doc.fillColor('#ffffff');
    headers.forEach((header, idx) => {
      const widths = [
        colWidths.ap,
        colWidths.morador,
        colWidths.espaco,
        colWidths.data,
        colWidths.horario,
        colWidths.telefone,
      ];
      doc.text(header, x, headerY + 5, {
        width: widths[idx],
        align: 'left',
      });
      x += widths[idx];
    });

    // Linhas de dados
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    let rowY = headerY + 25;

    const rows: ReservaRow[] = reservas.map((r) => ({
      numero: r.apartamento.numero,
      nome: r.morador.nome,
      espaco: r.espaco,
      data: new Date(r.data).toLocaleDateString('pt-BR'),
      horaInicio: r.horaInicio,
      duracaoHoras: r.duracaoHoras,
      telefone: r.morador.telefone,
    }));

    rows.forEach((row, idx) => {
      const horario =
        row.horaInicio !== undefined && row.duracaoHoras !== undefined
          ? `${row.horaInicio}h - ${row.horaInicio + row.duracaoHoras}h`
          : 'Dia inteiro';

      const rowData = [
        row.numero,
        row.nome,
        row.espaco,
        row.data,
        horario,
        row.telefone,
      ];

      // Alternating row colors
      if (idx % 2 === 0) {
        doc.rect(40, rowY - 3, 540, 16).fill('#f5f5f5');
        doc.fillColor('#000000');
      }

      x = 40;
      const widths = [
        colWidths.ap,
        colWidths.morador,
        colWidths.espaco,
        colWidths.data,
        colWidths.horario,
        colWidths.telefone,
      ];

      rowData.forEach((cell, cellIdx) => {
        doc.text(String(cell), x, rowY, {
          width: widths[cellIdx],
          align: 'left',
        });
        x += widths[cellIdx];
      });

      rowY += 16;

      // Página nova se necessário
      if (rowY > 750) {
        doc.addPage();
        rowY = 40;
      }
    });

    // Rodapé
    doc.fontSize(8).fillColor('#999999').text(
      `Total de reservas: ${rows.length}`,
      { align: 'center' },
    );

    doc.end();

    return doc as unknown as Readable;
  }
}
