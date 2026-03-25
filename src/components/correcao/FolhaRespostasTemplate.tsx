import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

interface FolhaRespostasProps {
  prova: any;
  turmaNome: string;
  disciplinaNome: string;
}

const ALTS = ['A', 'B', 'C', 'D', 'E'];

export function FolhaRespostasTemplate({ prova, turmaNome, disciplinaNome }: FolhaRespostasProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const questoes = Array.from({ length: prova.numero_questoes }, (_, i) => i + 1);

  const qrData = JSON.stringify({
    id: prova.id,
    titulo: prova.titulo,
    turma: turmaNome,
    questoes: prova.numero_questoes,
  });

  function imprimir() {
    const win = window.open('', '_blank');
    if (!win || !printRef.current) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${prova.titulo}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:20px;font-size:11px;color:#000}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:10px}
      .header-info h1{font-size:14px;font-weight:bold;text-transform:uppercase}
      .header-info p{font-size:11px;margin-top:2px}
      .qr-box{display:flex;flex-direction:column;align-items:center;gap:4px}
      .qr-label{font-size:9px;text-align:center;font-weight:bold}
      .student-fields{display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:10px}
      .field-line{border-bottom:1px solid #000;padding-bottom:2px;margin-top:12px}
      .field-label{font-size:10px;font-weight:bold;color:#444}
      .roll-box{border:1.5px solid #000;padding:6px 10px;text-align:center;min-width:70px}
      .roll-label{font-size:10px;font-weight:bold}
      .roll-write{font-size:18px;border-bottom:1.5px solid #000;min-height:22px;margin:4px 0}
      .instructions{background:#f0f0f0;padding:6px 8px;margin-bottom:10px;border-radius:4px;font-size:10px}
      .answers-grid{display:grid;grid-template-columns:repeat(${Math.min(questoes.length, 5 <= 20 ? 4 : 5)},1fr);gap:6px}
      .q-row{display:flex;align-items:center;gap:4px;border:1px solid #ccc;padding:4px 6px;border-radius:4px}
      .q-num{font-weight:bold;font-size:10px;min-width:20px}
      .bubble{width:18px;height:18px;border:1.5px solid #000;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;margin:0 1px}
      .footer{margin-top:14px;border-top:1px solid #ccc;padding-top:6px;display:flex;justify-content:space-between;font-size:10px;color:#666}
      @media print{body{padding:10px}}
    </style>
    ${printRef.current.querySelector('svg')?.outerHTML ? '' : ''}
    </head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  const cols = questoes.length <= 20 ? 4 : questoes.length <= 40 ? 5 : 6;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={imprimir}><Printer className="w-4 h-4 mr-1.5" />Imprimir Folha</Button>
      </div>

      {/* Preview da folha */}
      <div ref={printRef} className="bg-white border-2 border-border rounded-lg p-5 text-[11px] text-black font-sans max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-3">
          <div className="flex-1">
            <h1 className="text-sm font-bold uppercase">{prova.escola || 'Escola Municipal'}</h1>
            <p className="mt-1"><strong>Componente:</strong> {disciplinaNome} &nbsp;|&nbsp; <strong>Turma:</strong> {turmaNome}</p>
            <p><strong>Professor(a):</strong> {prova.professor || '_________________________'} &nbsp;|&nbsp; <strong>Data:</strong> {prova.data_aplicacao ? new Date(prova.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR') : '____/____/______'}</p>
            <p className="mt-1 text-sm font-bold uppercase">{prova.titulo}</p>
            <p><strong>Bimestre:</strong> {prova.bimestre}º &nbsp;|&nbsp; <strong>Valor:</strong> {prova.valor_total || 10} pontos &nbsp;|&nbsp; <strong>Questões:</strong> {prova.numero_questoes}</p>
          </div>
          <div className="flex flex-col items-center gap-1 ml-4 flex-shrink-0">
            <QRCodeSVG value={qrData} size={70} level="M" />
            <span className="text-[9px] font-bold text-center leading-tight">Código da<br/>Avaliação</span>
          </div>
        </div>

        {/* Identificação do aluno */}
        <div className="grid grid-cols-[1fr_auto] gap-4 mb-3">
          <div>
            <div className="text-[10px] font-bold text-gray-600 mb-1">IDENTIFICAÇÃO DO ALUNO</div>
            <div className="border-b border-black pb-0.5 mb-2">
              <span className="text-[10px] font-bold text-gray-500">Nome completo: </span>
            </div>
            <div className="border-b border-black h-5 mb-2" />
          </div>
          <div className="border-2 border-black rounded p-2 text-center min-w-[80px]">
            <div className="text-[10px] font-bold mb-1">Nº CHAMADA</div>
            <div className="border-b-2 border-black h-7 text-xl font-bold text-center" />
            <div className="text-[9px] mt-1 text-gray-500">Roll No.</div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-gray-100 rounded p-2 mb-3 text-[10px]">
          <strong>INSTRUÇÕES:</strong> {prova.observacoes || 'Leia atentamente cada questão. Preencha apenas uma alternativa por questão. Use caneta esferográfica azul ou preta. Identifique-se claramente com nome e número de chamada.'}
        </div>

        {/* Grade de respostas */}
        <div className="mb-2">
          <div className="text-[10px] font-bold mb-2 uppercase">Folha de Respostas</div>
          <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {questoes.map(q => (
              <div key={q} className="flex items-center gap-1 border border-gray-300 rounded px-1.5 py-1">
                <span className="font-bold text-[10px] w-5 text-right flex-shrink-0">{q}.</span>
                <div className="flex gap-0.5">
                  {ALTS.map(alt => (
                    <span key={alt} className="w-[18px] h-[18px] border-[1.5px] border-black rounded-full inline-flex items-center justify-center text-[9px] font-bold">{alt}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-gray-300 pt-2 flex justify-between text-[10px] text-gray-500">
          <span>Aulas previstas: {prova.aulas_previstas || '____'}</span>
          <span>Ano letivo: {new Date().getFullYear()}</span>
          <span>Nota: ________</span>
        </div>
      </div>
    </div>
  );
}
