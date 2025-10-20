const PAGE_WIDTH = 595.28 // A4 width in points
const PAGE_HEIGHT = 841.89 // A4 height in points
const TOP_MARGIN = 60
const BOTTOM_MARGIN = 60
const DEFAULT_FONT_SIZE = 12
const DEFAULT_LINE_HEIGHT = 16

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function paginateSegments(segments) {
  const maxHeight = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN
  const pages = []
  let currentPage = []
  let currentHeight = 0

  segments.forEach((segment) => {
    const height = segment.lineHeight ?? DEFAULT_LINE_HEIGHT
    if (currentPage.length > 0 && currentHeight + height > maxHeight) {
      pages.push(currentPage)
      currentPage = []
      currentHeight = 0
    }
    currentPage.push(segment)
    currentHeight += height
  })

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages.length > 0 ? pages : [[]]
}

function createContentStream(segments) {
  if (segments.length === 0) {
    return 'BT\n/F1 12 Tf\n1 0 0 1 72 781 Tm\n( ) Tj\nET'
  }

  const commands = ['BT']
  let currentFontSize = null
  let firstLine = true
  let currentY = PAGE_HEIGHT - TOP_MARGIN

  segments.forEach((segment) => {
    const fontSize = segment.fontSize ?? DEFAULT_FONT_SIZE
    const lineHeight = segment.lineHeight ?? DEFAULT_LINE_HEIGHT
    const text = escapePdfText(segment.text ?? '')

    if (currentFontSize !== fontSize) {
      commands.push(`/F1 ${fontSize} Tf`)
      currentFontSize = fontSize
    }

    if (firstLine) {
      commands.push(`1 0 0 1 72 ${currentY.toFixed(2)} Tm`)
      firstLine = false
    } else {
      currentY -= lineHeight
      commands.push(`0 -${lineHeight.toFixed(2)} Td`)
    }

    commands.push(`(${text}) Tj`)
  })

  commands.push('ET')
  return commands.join('\n')
}

function createPdfDocument(pages) {
  const objects = []

  function reserveObject() {
    objects.push({ content: '' })
    return objects.length
  }

  function addObject(content) {
    objects.push({ content })
    return objects.length
  }

  const catalogIndex = reserveObject()
  const pagesIndex = reserveObject()
  const contentEntries = []

  const fontIndex = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pages.forEach((segments) => {
    const stream = createContentStream(segments)
    const length = stream.length
    const contentIndex = addObject(`<< /Length ${length} >>\nstream\n${stream}\nendstream`)
    const pageIndex = reserveObject()
    contentEntries.push({ pageIndex, contentIndex })
  })

  const kidsRefs = contentEntries.map((entry) => `${entry.pageIndex} 0 R`).join(' ')
  objects[catalogIndex - 1].content = `<< /Type /Catalog /Pages ${pagesIndex} 0 R >>`
  objects[pagesIndex - 1].content = `<< /Type /Pages /Kids [${kidsRefs}] /Count ${contentEntries.length} >>`

  contentEntries.forEach(({ pageIndex, contentIndex }) => {
    objects[pageIndex - 1].content =
      `<< /Type /Page /Parent ${pagesIndex} 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] ` +
      `/Resources << /Font << /F1 ${fontIndex} 0 R >> >> /Contents ${contentIndex} 0 R >>`
  })

  const encoder = new TextEncoder()
  const chunks = []
  let length = 0

  function append(chunk) {
    chunks.push(chunk)
    length += encoder.encode(chunk).length
  }

  append('%PDF-1.4\n')
  const offsets = [0]

  objects.forEach((obj, index) => {
    offsets.push(length)
    append(`${index + 1} 0 obj\n${obj.content}\nendobj\n`)
  })

  const startxref = length
  append(`xref\n0 ${objects.length + 1}\n`)
  append('0000000000 65535 f \n')
  for (let i = 1; i <= objects.length; i += 1) {
    append(`${offsets[i].toString().padStart(10, '0')} 00000 n \n`)
  }
  append(`trailer << /Size ${objects.length + 1} /Root ${catalogIndex} 0 R >>\n`)
  append(`startxref\n${startxref}\n%%EOF`)

  const pdfString = chunks.join('')
  return encoder.encode(pdfString)
}

function downloadPdfFromSegments(segments, fileName) {
  const pages = paginateSegments(segments)
  const pdfBytes = createPdfDocument(pages)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function buildBaseSegments(title, subtitleLines) {
  const segments = []
  segments.push({ text: title, fontSize: 18, lineHeight: 28 })
  subtitleLines.forEach((line) => {
    segments.push({ text: line, fontSize: 12, lineHeight: 16 })
  })
  segments.push({ text: '', fontSize: 12, lineHeight: 18 })
  return segments
}

export function generateParticipantHistoryPdf({ userName, presencas, formatDate, fileName }) {
  const safeName = userName?.trim() || 'Participante'
  const segments = buildBaseSegments('Relatório de presenças', [
    `Participante: ${safeName || 'Não identificado'}`,
    `Total de registros: ${presencas.length}`,
  ])

  if (!presencas.length) {
    segments.push({ text: 'Nenhuma presença registrada até o momento.', fontSize: 12, lineHeight: 16 })
  } else {
    presencas.forEach((presenca, index) => {
      const evento = presenca.nomeEvento || presenca.eventoID || 'Evento sem nome'
      segments.push({ text: `${index + 1}. Evento: ${evento}`, fontSize: 12, lineHeight: 18 })
      segments.push({ text: `   Data: ${formatDate(presenca)}`, fontSize: 12, lineHeight: 16 })
      segments.push({ text: `   Hash: ${presenca.hash || '—'}`, fontSize: 12, lineHeight: 16 })
      segments.push({ text: '', fontSize: 12, lineHeight: 14 })
    })
  }

  const downloadName = fileName || `${safeName.replace(/\s+/g, '-').toLowerCase() || 'relatorio'}-presencas.pdf`
  downloadPdfFromSegments(segments, downloadName)
}

export function generateAdminHistoryPdf({ user, presencas, formatDate, fileName }) {
  const displayName = user?.userName || user?.matricula || 'Usuário sem nome'
  const baseSegments = [
    `Aluno: ${displayName}`,
    `Matrícula: ${user?.matricula || '—'}`,
    `DID: ${user?.did || 'Não informado'}`,
    `Total de registros: ${presencas.length}`,
  ]
  const segments = buildBaseSegments('Relatório de presenças (admin)', baseSegments)

  if (!presencas.length) {
    segments.push({ text: 'Nenhuma presença registrada para este participante.', fontSize: 12, lineHeight: 16 })
  } else {
    presencas.forEach((presenca, index) => {
      const evento = presenca.nomeEvento || presenca.eventoID || 'Evento sem nome'
      segments.push({ text: `${index + 1}. Evento: ${evento}`, fontSize: 12, lineHeight: 18 })
      segments.push({ text: `   Data: ${formatDate(presenca.dataHora)}`, fontSize: 12, lineHeight: 16 })
      segments.push({ text: `   Hash: ${presenca.hash || '—'}`, fontSize: 12, lineHeight: 16 })
      segments.push({ text: '', fontSize: 12, lineHeight: 14 })
    })
  }

  const normalized =
    fileName ||
    `relatorio-${
      (user?.matricula || user?.did || displayName).toString().replace(/\s+/g, '-').toLowerCase() || 'admin'
    }.pdf`
  downloadPdfFromSegments(segments, normalized)
}
