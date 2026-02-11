// import jsPDF from "jspdf"
// import autoTable from "jspdf-autotable"

// export const generatePDFFromData = (quotationData, selectedReferences, specialDiscount) => {
//   // Change orientation to 'landscape'
//   const doc = new jsPDF("l", "mm", "a4") // 'l' for landscape

//   const pageWidth = 297 // A4 Landscape width
//   const pageHeight = 210 // A4 Landscape height
//   const margin = 15 // Adjusted margin for landscape
//   let currentY = 15 // Adjusted starting Y for landscape

//   // Professional color palette - Refined for a cleaner look
//   const colors = {
//     primary: [28, 48, 80], // Dark Blue (more professional)
//     secondary: [90, 120, 150], // Muted Blue
//     accent: [200, 50, 50], // Muted Red for highlights
//     success: [40, 140, 80], // Pleasant Green
//     background: {
//       light: [250, 250, 250], // Off-White
//       blue: [235, 245, 255], // Very Light Blue
//       green: [240, 255, 240], // Very Light Green
//       yellow: [255, 255, 220], // Pale Yellow
//     },
//     text: {
//       primary: [40, 40, 40], // Dark Gray
//       secondary: [90, 90, 90], // Medium Gray
//       muted: [150, 150, 150], // Light Gray
//     },
//     border: {
//       primary: [180, 180, 180], // Medium Light Gray
//       secondary: [220, 220, 220], // Very Light Gray
//       accent: [150, 180, 210], // Light Steel Blue
//     }
//   }

//   const wrapText = (text, maxWidth) => {
//     return doc.splitTextToSize(text || "", maxWidth)
//   }

//   const formatCurrency = (value) => {
//     return new Intl.NumberFormat("en-IN", {
//       style: "currency",
//       currency: "INR",
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     })
//       .format(value)
//       .replace("₹", "")
//       .trim()
//   }

//   const checkSpace = (requiredHeight) => {
//     if (currentY + requiredHeight > pageHeight - margin - 20) {
//       doc.addPage()
//       currentY = margin + 10 // Reset Y for new page in landscape
//       return true
//     }
//     return false
//   }

//   const addDecorative = () => {
//     doc.setFillColor(...colors.primary)
//     doc.rect(0, 0, pageWidth, 5, "F")
//     doc.setFillColor(...colors.accent)
//     doc.rect(0, 5, pageWidth, 2, "F")
//   }

//   const addPageHeader = () => {
//     addDecorative()

//     currentY = margin + 5

//     doc.setFillColor(...colors.accent)
//     doc.rect(margin, currentY, 15, 15, "F")
//     doc.setTextColor(255, 255, 255)
//     doc.setFontSize(10)
//     doc.setFont("helvetica", "bold")
//     doc.text("DE", margin + 7.5, currentY + 9, { align: "center" })

//     doc.setTextColor(...colors.primary)
//     doc.setFontSize(24)
//     doc.setFont("helvetica", "bold")
//     doc.text("DIVINE EMPIRE INDIA PVT. LTD.", pageWidth / 2, currentY + 5, { align: "center" })

//     doc.setFontSize(10)
//     doc.setTextColor(...colors.text.secondary)
//     doc.setFont("helvetica", "normal")
//     doc.text("Professional Business Solutions", pageWidth / 2, currentY + 13, { align: "center" })

//     currentY += 25

//     doc.setFillColor(...colors.background.blue)
//     doc.setDrawColor(...colors.border.accent)
//     doc.setLineWidth(0.5)
//     doc.rect(margin, currentY, pageWidth - 2 * margin, 10, "F")
//     doc.rect(margin, currentY, pageWidth - 2 * margin, 10)

//     doc.setFont("helvetica", "bold")
//     doc.setFontSize(11)
//     doc.setTextColor(...colors.primary)
//     doc.text(`Quotation No: ${quotationData.quotationNo}`, margin + 5, currentY + 6)
//     doc.text(`Date: ${quotationData.date}`, pageWidth - margin - 5, currentY + 6, { align: "right" })

//     currentY += 18
//   }

//   addPageHeader()

//   // Fixed consignor/consignee details with proper height calculation
//   const consignorDetails = [
//     `Name: ${selectedReferences[0] || "N/A"}`,
//     `Address: ${quotationData.consignorAddress}`,
//     `Mobile: ${quotationData.consignorMobile?.split(",")[0] || "N/A"}`,
//     `GSTIN: ${quotationData.consignorGSTIN || "N/A"}`,
//     `State Code: ${quotationData.consignorStateCode || "N/A"}`,
//   ]

//   const consigneeDetails = [
//     `Name: ${quotationData.consigneeName}`,
//     `Address: ${quotationData.consigneeAddress}`,
//     `Contact: ${quotationData.consigneeContactName || "N/A"}`,
//     `Mobile: ${quotationData.consigneeContactNo || "N/A"}`,
//     `GSTIN: ${quotationData.consigneeGSTIN || "N/A"}`,
//     `State Code: ${quotationData.consigneeStateCode || "N/A"}`,
//   ]

//   const boxWidth = (pageWidth - 3 * margin) / 2
//   const cardPadding = 6
//   const lineHeight = 4.5

//   // Calculate required height for each box
//   const calculateBoxHeight = (details) => {
//     let totalHeight = 8 + 8 + cardPadding // Header + top padding + bottom padding
//     details.forEach(line => {
//       const wrappedLines = wrapText(line, boxWidth - 2 * cardPadding)
//       totalHeight += wrappedLines.length * lineHeight
//     })
//     return Math.max(totalHeight, 50) // Minimum height of 50mm
//   }

//   const consignorHeight = calculateBoxHeight(consignorDetails)
//   const consigneeHeight = calculateBoxHeight(consigneeDetails)
//   const boxHeight = Math.max(consignorHeight, consigneeHeight) // Use same height for both boxes

//   // Draw consignor box
//   doc.setFillColor(...colors.background.light)
//   doc.setDrawColor(...colors.border.primary)
//   doc.setLineWidth(0.6)
//   doc.rect(margin, currentY, boxWidth, boxHeight, "FD")

//   // Draw consignee box
//   doc.rect(margin + boxWidth + margin, currentY, boxWidth, boxHeight, "FD")

//   // Draw headers
//   doc.setFillColor(...colors.primary)
//   doc.rect(margin, currentY, boxWidth, 8, "F")
//   doc.rect(margin + boxWidth + margin, currentY, boxWidth, 8, "F")

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.setTextColor(255, 255, 255)
//   doc.text("FROM (CONSIGNOR)", margin + boxWidth/2, currentY + 5, { align: "center" })
//   doc.text("TO (CONSIGNEE)", margin + boxWidth + margin + boxWidth/2, currentY + 5, { align: "center" })

//   // Add consignor details
//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(8.5)
//   doc.setTextColor(...colors.text.primary)

//   let consignorY = currentY + 8 + cardPadding
//   consignorDetails.forEach((line) => {
//     const wrappedLines = wrapText(line, boxWidth - 2 * cardPadding)
//     wrappedLines.forEach((wrappedLine) => {
//       doc.text(wrappedLine, margin + cardPadding, consignorY)
//       consignorY += lineHeight
//     })
//   })

//   // Add consignee details
//   let consigneeY = currentY + 8 + cardPadding
//   consigneeDetails.forEach((line) => {
//     const wrappedLines = wrapText(line, boxWidth - 2 * cardPadding)
//     wrappedLines.forEach((wrappedLine) => {
//       doc.text(wrappedLine, margin + boxWidth + margin + cardPadding, consigneeY)
//       consigneeY += lineHeight
//     })
//   })

//   currentY += boxHeight + 15

//   const itemsData = quotationData.items.map((item, index) => [
//     index + 1,
//     item.code,
//     item.name,
//     item.description,
//     `${item.gst}%`,
//     item.qty,
//     item.units,
//     formatCurrency(item.rate),
//     `${item.discount}%`,
//     formatCurrency(item.flatDiscount),
//     formatCurrency(item.amount),
//   ])

//   doc.setFillColor(...colors.background.blue)
//   doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 10, "F")
//   doc.setDrawColor(...colors.border.accent)
//   doc.setLineWidth(0.5)
//   doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 10)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(12)
//   doc.setTextColor(...colors.primary)
//   doc.text("ITEM DETAILS", margin + 5, currentY + 1)

//   currentY += 8

//   // Calculate available width for the table
//   const availableTableWidth = pageWidth - 2 * margin;
//   // Distribute column widths to fit perfectly in landscape
//   // Total width: 297mm - 2*15mm = 267mm

//   autoTable(doc, {
//     startY: currentY,
//     head: [["S.No", "Code", "Product Name", "Description", "GST %", "Qty", "Units", "Rate", "Disc %", "Flat Disc", "Amount"]],
//     body: itemsData,
//     margin: { left: margin, right: margin },
//     styles: {
//       fontSize: 8,
//       cellPadding: 3,
//       overflow: 'linebreak',
//       lineColor: colors.border.secondary,
//       lineWidth: 0.3,
//       textColor: colors.text.primary,
//       font: 'helvetica',
//     },
//     headStyles: {
//       fillColor: colors.primary,
//       textColor: [255, 255, 255],
//       fontSize: 9,
//       fontStyle: 'bold',
//       cellPadding: 4,
//       halign: 'center',
//       valign: 'middle',
//     },
//     alternateRowStyles: {
//       fillColor: colors.background.light,
//     },
//     columnStyles: {
//       0: { cellWidth: 'auto', halign: 'center' }, // S.No
//       1: { cellWidth: 'auto', halign: 'center' }, // Code
//       2: { cellWidth: 'auto', fontStyle: 'bold' }, // Product Name
//       3: { cellWidth: 'auto' }, // Description (largest)
//       4: { cellWidth: 'auto', halign: 'center' }, // GST %
//       5: { cellWidth: 'auto', halign: 'center' }, // Qty
//       6: { cellWidth: 'auto', halign: 'center' }, // Units
//       7: { cellWidth: 'auto', halign: 'right' }, // Rate
//       8: { cellWidth: 'auto', halign: 'center' }, // Disc %
//       9: { cellWidth: 'auto', halign: 'right' }, // Flat Disc
//       10: {
//         cellWidth: 'auto', // Amount
//         halign: 'right',
//         fontStyle: 'bold',
//         fillColor: colors.background.green,
//         textColor: colors.success,
//       },
//     },
//     didParseCell: function(data) {
//       // Center-align header text for specific columns if needed (already in headStyles)
//     },
//     didDrawPage: (data) => {
//       currentY = data.cursor.y;
//     },
//   });


//   currentY = doc.lastAutoTable.finalY + 15

//   checkSpace(80)

//   const summaryBoxWidth = 80
//   const summaryBoxHeight = 60
//   const summaryX = pageWidth - margin - summaryBoxWidth

//   doc.setFillColor(...colors.background.light)
//   doc.setDrawColor(...colors.border.primary)
//   doc.setLineWidth(0.8)
//   doc.rect(summaryX, currentY, summaryBoxWidth, summaryBoxHeight, "FD")

//   doc.setFillColor(...colors.primary)
//   doc.rect(summaryX, currentY, summaryBoxWidth, 8, "F")
//   doc.setTextColor(255, 255, 255)
//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.text("FINANCIAL SUMMARY", summaryX + summaryBoxWidth / 2, currentY + 5, { align: "center" })

//   const summaryItems = [
//     { label: "Subtotal:", value: formatCurrency(quotationData.subtotal), color: colors.text.primary },
//     { label: "Total Flat Discount:", value: `-${formatCurrency(quotationData.totalFlatDiscount)}`, color: colors.accent },
//     { label: "Taxable Amount:", value: formatCurrency(quotationData.subtotal - quotationData.totalFlatDiscount), color: colors.text.primary },
//   ]

//   if (quotationData.isIGST) {
//     summaryItems.push({
//       label: `IGST (${quotationData.igstRate}%):`,
//       value: formatCurrency(quotationData.igstAmount),
//       color: colors.secondary
//     })
//   } else {
//     summaryItems.push({
//       label: `CGST (${quotationData.cgstRate}%):`,
//       value: formatCurrency(quotationData.cgstAmount),
//       color: colors.secondary
//     })
//     summaryItems.push({
//       label: `SGST (${quotationData.sgstRate}%):`,
//       value: formatCurrency(quotationData.sgstAmount),
//       color: colors.secondary
//     })
//   }

//   summaryItems.push({
//     label: "TOTAL AMOUNT:",
//     value: formatCurrency(quotationData.total),
//     color: colors.success,
//     bold: true
//   })

//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(8.5)
//   let summaryY = currentY + 12

//   summaryItems.forEach((item, index) => {
//     if (item.bold || index === summaryItems.length - 1) {
//       doc.setFont("helvetica", "bold")
//       doc.setFontSize(9.5)
//       doc.setFillColor(...colors.background.green)
//       doc.rect(summaryX + 2, summaryY - 3, summaryBoxWidth - 4, 7, "F")
//     } else {
//       doc.setFont("helvetica", "normal")
//       doc.setFontSize(8.5)
//     }

//     doc.setTextColor(...item.color)
//     doc.text(item.label, summaryX + 4, summaryY)
//     doc.text(item.value, summaryX + summaryBoxWidth - 4, summaryY, { align: "right" })
//     summaryY += 6.5
//   })

//   currentY = Math.max(currentY + summaryBoxHeight + 10, summaryY + 10)

//   const addSectionHeader = (title, icon = "■") => {
//     doc.setFillColor(...colors.background.blue)
//     doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 8, "F")
//     doc.setDrawColor(...colors.border.accent)
//     doc.setLineWidth(0.4)
//     doc.rect(margin, currentY - 3, pageWidth - 2 * margin, 8)

//     doc.setFont("helvetica", "bold")
//     doc.setFontSize(10)
//     doc.setTextColor(...colors.primary)
//     doc.text(`${icon} ${title}`, margin + 5, currentY + 2)

//     doc.setFont("helvetica", "normal")
//     doc.setFontSize(8.5)
//     doc.setTextColor(...colors.text.secondary)
//     currentY += 12
//   }

//   addSectionHeader("TERMS & CONDITIONS", "")

//   doc.setFillColor(...colors.background.light)
//   // Add proper spacing after the section header
//   const termsContentY = currentY + 3 // Added 3mm space from the section header
//   let maxTermsHeight = 0

//   const terms = [
//     { label: "Validity", value: quotationData.validity },
//     { label: "Payment Terms", value: quotationData.paymentTerms },
//     { label: "Delivery", value: quotationData.delivery },
//     { label: "Freight", value: quotationData.freight },
//     { label: "Insurance", value: quotationData.insurance },
//     { label: "Taxes", value: quotationData.taxes },
//   ]

//   // Reset currentY to termsContentY + padding for content
//   currentY = termsContentY + 4 // 4mm padding from top border

//   terms.forEach((term) => {
//     doc.setTextColor(...colors.text.primary)
//     doc.setFont("helvetica", "normal")
//     const text = `${term.label}: ${term.value}`
//     const wrappedLines = wrapText(text, pageWidth - 2 * margin - 20)
//     wrappedLines.forEach((line) => {
//       doc.text(line, margin + 10, currentY)
//       currentY += 4.5
//     })
//     maxTermsHeight = Math.max(maxTermsHeight, currentY - termsContentY)
//   })

//   // Draw the border around terms & conditions with proper spacing
//   doc.setDrawColor(...colors.border.secondary)
//   doc.setLineWidth(0.3)
//   doc.rect(margin + 5, termsContentY - 2, pageWidth - 2 * margin - 10, maxTermsHeight + 6, "S") // Added 6mm total padding (3 top + 3 bottom)

//   currentY += 5

//   if (quotationData.specialOffers && quotationData.specialOffers.filter((offer) => offer.trim()).length > 0) {
//     checkSpace(30)
//     addSectionHeader("DIVINE EMPIRE'S 10TH ANNIVERSARY SPECIAL OFFER", "")

//     doc.setFillColor(...colors.background.yellow)
//     const offersContentY = currentY
//     let maxOffersHeight = 0
//     quotationData.specialOffers
//       .filter((offer) => offer.trim())
//       .forEach((offer) => {
//         doc.setTextColor(...colors.accent)
//         doc.setFont("helvetica", "bold")
//         const text = `★ ${offer}`
//         const wrappedLines = wrapText(text, pageWidth - 2 * margin - 20)
//         wrappedLines.forEach((line) => {
//           doc.text(line, margin + 10, currentY)
//           currentY += 5
//         })
//         maxOffersHeight = Math.max(maxOffersHeight, currentY - offersContentY)
//       })

//     doc.setDrawColor(...colors.accent)
//     doc.setLineWidth(0.6)
//     doc.rect(margin + 5, offersContentY - 2, pageWidth - 2 * margin - 10, maxOffersHeight + 4, "S")

//     currentY += 5
//   }

//   if (quotationData.notes && quotationData.notes.length > 0) {
//     checkSpace(30)
//     addSectionHeader("ADDITIONAL NOTES", "")

//     doc.setFillColor(...colors.background.light)
//     const notesContentY = currentY
//     let maxNotesHeight = 0
//     quotationData.notes
//       .filter((note) => note.trim())
//       .forEach((note) => {
//         doc.setTextColor(...colors.text.primary)
//         doc.setFont("helvetica", "normal")
//         const text = `• ${note}`
//         const wrappedLines = wrapText(text, pageWidth - 2 * margin - 20)
//         wrappedLines.forEach((line) => {
//           doc.text(line, margin + 10, currentY)
//           currentY += 5
//         })
//         maxNotesHeight = Math.max(maxNotesHeight, currentY - notesContentY)
//       })

//     doc.setDrawColor(...colors.border.secondary)
//     doc.setLineWidth(0.3)
//     doc.rect(margin + 5, notesContentY - 2, pageWidth - 2 * margin - 10, maxNotesHeight + 4, "S")

//     currentY += 5
//   }

//   checkSpace(60)

//   addSectionHeader("BANK DETAILS", "")

//   doc.setFillColor(...colors.background.green)
//   // Add proper spacing after the section header
//   const bankContentY = currentY + 3 // Added 3mm space from the section header
//   let maxBankHeight = 0

//   const bankDetails = [
//     { label: "Account No.", value: quotationData.accountNo },
//     { label: "Bank Name", value: quotationData.bankName },
//     { label: "Bank Address", value: quotationData.bankAddress },
//     { label: "IFSC Code", value: quotationData.ifscCode },
//     { label: "Email", value: quotationData.email },
//     { label: "Website", value: quotationData.website },
//     { label: "Company PAN", value: quotationData.pan },
//   ]

//   // Reset currentY to bankContentY + padding for content
//   currentY = bankContentY + 4 // 4mm padding from top border

//   bankDetails.forEach((detail) => {
//     doc.setTextColor(...colors.primary)
//     doc.setFont("helvetica", "bold")
//     doc.setFontSize(8)
//     doc.text(`${detail.label}:`, margin + 10, currentY)
//     doc.setTextColor(...colors.text.secondary)
//     doc.setFont("helvetica", "normal")
//     const wrappedValue = wrapText(detail.value, (pageWidth - 2 * margin - 20) * 0.7)
//     wrappedValue.forEach((line) => {
//         doc.text(line, margin + 50, currentY)
//         currentY += 4.5
//     })
//     maxBankHeight = Math.max(maxBankHeight, currentY - bankContentY)
//   })

//   // Draw the border around bank details with proper spacing
//   doc.setDrawColor(...colors.success)
//   doc.setLineWidth(0.5)
//   doc.rect(margin + 5, bankContentY - 2, pageWidth - 2 * margin - 10, maxBankHeight + 6, "S") // Added 6mm total padding (3 top + 3 bottom)

//   currentY += 10
//   checkSpace(50)

//   addSectionHeader("DECLARATION", "")

//   doc.setFillColor(255, 255, 255)
//   // Add proper spacing after the section header
//   const declarationContentY = currentY + 3 // Added 3mm space from the section header
//   let maxDeclarationHeight = 0
//   const declaration = [
//     "We declare that this Quotation shows the actual price of the goods described",
//     "and that all particulars are true and correct.",
//   ]

//   // Reset currentY to declarationContentY + padding for content
//   currentY = declarationContentY + 4 // 4mm padding from top border

//   doc.setTextColor(...colors.text.primary)
//   doc.setFont("helvetica", "normal")
//   declaration.forEach((line) => {
//     const wrappedLines = wrapText(line, pageWidth - 2 * margin - 20)
//     wrappedLines.forEach((wrappedLine) => {
//         doc.text(wrappedLine, margin + 10, currentY)
//         currentY += 5
//     })
//     maxDeclarationHeight = Math.max(maxDeclarationHeight, currentY - declarationContentY)
//   })

//   // Draw the border around declaration with proper spacing
//   doc.setDrawColor(...colors.border.primary)
//   doc.setLineWidth(0.5)
//   doc.rect(margin + 5, declarationContentY - 2, pageWidth - 2 * margin - 10, maxDeclarationHeight + 6, "S") // Added 6mm total padding (3 top + 3 bottom)

//   currentY += 15

//   doc.setFillColor(...colors.background.blue)
//   doc.setDrawColor(...colors.border.accent)
//   doc.setLineWidth(0.8)
//   doc.rect(margin, currentY, pageWidth - 2 * margin, 20, "FD")

//   doc.setDrawColor(...colors.text.muted)
//   doc.setLineWidth(0.4)
//   doc.line(pageWidth - margin - 80, currentY + 12, pageWidth - margin - 10, currentY + 12)

//   doc.setFont("helvetica", "bold")
//   doc.setFontSize(10)
//   doc.setTextColor(...colors.primary)
//   doc.text(`Prepared By: ${quotationData.preparedBy}`, margin + 10, currentY + 8)

//   doc.setFont("helvetica", "normal")
//   doc.setFontSize(8.5)
//   doc.setTextColor(...colors.text.secondary)
//   doc.text("Authorized Signatory", pageWidth - margin - 45, currentY + 16, { align: "center" })

//   const pageCount = doc.internal.getNumberOfPages()
//   for (let i = 1; i <= pageCount; i++) {
//     doc.setPage(i)

//     doc.setFillColor(...colors.background.light)
//     doc.rect(0, pageHeight - 15, pageWidth, 15, "F") // Adjusted footer height for landscape

//     doc.setDrawColor(...colors.border.secondary)
//     doc.setLineWidth(0.3)
//     doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

//     doc.setFontSize(7.5)
//     doc.setTextColor(...colors.text.muted)
//     doc.setFont("helvetica", "normal")

//     doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" })

//     doc.text("Generated by Divine Empire Professional Quotation System", margin, pageHeight - 10)
//     doc.text("This is a computer-generated document", margin, pageHeight - 4)

//     const now = new Date()
//     doc.text(`Generated on: ${now.toLocaleString()}`, pageWidth - margin, pageHeight - 10, { align: "right" })
//   }

//   return doc.output("datauristring").split(",")[1]
// }







import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export const generatePDFFromData = (quotationData, selectedReferences, specialDiscount, hiddenColumns = {}) => {
  const doc = new jsPDF("p", "mm", "a4")

  const pageWidth = 210
  const pageHeight = 297
  const margin = 15
  let currentY = 15

  const wrapText = (text, maxWidth) => {
    return doc.splitTextToSize(text || "", maxWidth)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(value || 0)
      .replace("₹", "")
      .trim()
  }

  const checkSpace = (requiredHeight) => {
    if (currentY + requiredHeight > pageHeight - margin - 20) {
      doc.addPage()
      currentY = margin + 10
      return true
    }
    return false
  }

  const addPageHeader = () => {
    currentY = margin

    // Header background with light blue color
    doc.setFillColor(240, 248, 255) // Light blue background
    doc.rect(margin, currentY, pageWidth - 2 * margin, 40, "F")

    // Header border
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(margin, currentY, pageWidth - 2 * margin, 40)

    // Company name section (LEFT SIDE) - Better styling and positioning
    doc.setTextColor(0, 50, 100) // Dark blue color for company name
    doc.setFontSize(22) // Adjusted size
    doc.setFont("helvetica", "bold")
    doc.text("Botivate Services LLP", margin + 8, currentY + 15)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    doc.text("Powering Businesses On Autopilot", margin + 8, currentY + 25)

    // Add a subtle line under company name
    doc.setDrawColor(0, 50, 100)
    doc.setLineWidth(0.3)
    doc.line(margin + 8, currentY + 27, margin + 65, currentY + 27)

    // Quotation section (RIGHT SIDE) - Better positioning and styling
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(0, 50, 100) // Dark blue for quotation title
    doc.text("QUOTATION", pageWidth - margin - 8, currentY + 15, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`No: ${quotationData.quotationNo || "NBD-25-26-002"}`, pageWidth - margin - 8, currentY + 25, { align: "right" })

    const dateStr = quotationData.date ? new Date(quotationData.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')
    doc.text(`Date: ${dateStr}`, pageWidth - margin - 8, currentY + 33, { align: "right" })

    currentY += 50
  }

  // Add main document border (4 sides)
  const addMainBorder = () => {
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(1)
    doc.rect(margin - 5, margin - 5, pageWidth - 2 * margin + 10, pageHeight - 2 * margin + 10)
  }

  // Only add header on first page
  addPageHeader()

  // FROM and TO sections side by side - In one combined box
  const sectionWidth = (pageWidth - 3 * margin) / 2
  const sectionHeight = 55

  // Combined box for both FROM and TO sections
  doc.setFillColor(250, 250, 250) // Very light gray background
  doc.rect(margin, currentY, pageWidth - 2 * margin, sectionHeight, "F")
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(margin, currentY, pageWidth - 2 * margin, sectionHeight)

  // Add vertical separator line between FROM and TO
  const separatorX = margin + sectionWidth + 7.5
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(separatorX, currentY, separatorX, currentY + sectionHeight)

  const toSectionX = margin + sectionWidth + 15

  const consignorDetails = [
    String(selectedReferences && selectedReferences[0] ? selectedReferences[0] : "NEERAJ SIR"),
    `Plot no 27, PATRAPADA Bhagabanpur Industrial Estate`,
    `PATRAPADA, PS - TAMANDO, Bhubaneswar, Odisha 751019`,
    `State: ${String(quotationData.consignorState || "Odisha")}`,
    `Mobile: ${String(quotationData.consignorMobile && typeof quotationData.consignorMobile === 'string' ? quotationData.consignorMobile.split(",")[0] : quotationData.consignorMobile || "7024425225")}`,
    `Phone: ${String(quotationData.consignorPhone || "N/A")}`,
    `GSTIN: ${String(quotationData.consignorGSTIN || "21AAGCD9326H1ZS")}`,
    `State Code: ${String(quotationData.consignorStateCode || "21")}`,
  ]

  const consigneeDetails = [
    String(quotationData.consigneeName || "A S CONSTRUCTION , Raipur"),
    `31/554, GALI NO.6, NEW SHANTI NAGAR,`,
    `RAIPUR, Raipur, Chhattisgarh, 492004`,
    `State: ${String(quotationData.consigneeState || "Chhattisgarh")}`,
    `Contact: ${String(quotationData.consigneeContactName || "N/A")}`,
    `Mobile: ${String(quotationData.consigneeContactNo || "N/A")}`,
    `GSTIN: ${String(quotationData.consigneeGSTIN || "22AAGFA4837R2ZT")}`,
    `State Code: ${String(quotationData.consigneeStateCode || "22")}`,
    `MSME: ${String(quotationData.consigneeMSME || "UDYAM-CG-14-0001307")}`,
  ]

  // FROM section header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(0, 50, 100) // Dark blue for headers
  doc.text("FROM:", margin + 5, currentY + 10)

  // FROM section content
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  let fromY = currentY + 17
  consignorDetails.forEach((line) => {
    if (fromY < currentY + sectionHeight - 3) {
      const wrappedLines = wrapText(line, sectionWidth - 15)
      wrappedLines.forEach((wrappedLine) => {
        if (fromY < currentY + sectionHeight - 3) {
          doc.text(wrappedLine, margin + 5, fromY)
          fromY += 4
        }
      })
    }
  })

  // TO section header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(0, 50, 100) // Dark blue for headers
  doc.text("TO:", toSectionX + 5, currentY + 10)

  // TO section content
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  let toY = currentY + 17
  consigneeDetails.forEach((line) => {
    if (toY < currentY + sectionHeight - 3) {
      const wrappedLines = wrapText(line, sectionWidth - 10)
      wrappedLines.forEach((wrappedLine) => {
        if (toY < currentY + sectionHeight - 3) {
          doc.text(wrappedLine, toSectionX + 5, toY)
          toY += 4
        }
      })
    }
  })

  currentY += sectionHeight + 15

  // Items section header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(0, 50, 100) // Dark blue for section headers
  doc.text("Items:", margin, currentY)

  currentY += 8

  // FIXED: Add Product Name column to table headers
  const tableHeaders = ["S.No", "Code", "Product Name", "Description", "GST%", "Qty", "Units", "Rate"]
  if (!hiddenColumns.hideDisc) tableHeaders.push("Disc%")
  if (!hiddenColumns.hideFlatDisc) tableHeaders.push("Flat Disc")
  tableHeaders.push("Amount")

  // FIXED: Add Product Name data to items
  const itemsData = quotationData.items ? quotationData.items.map((item, index) => {
    const row = [
      String(index + 1),                                    // S.No
      String(item.code || "AFG10017"),                     // Code
      String(item.name || "FISCHER-ANCHOR-FWA 16X180"),    // Product Name
      String(item.description || ""),                       // Description (separate from name)
      String(`${item.gst || 18}%`),                        // GST%
      String(item.qty || 1),                               // Qty
      String(item.units || "Nos"),                         // Units
      String(formatCurrency(item.rate || 1712121.00)),     // Rate
    ]
    if (!hiddenColumns.hideDisc) row.push(String(`${item.discount || 0}%`))           // Disc%
    if (!hiddenColumns.hideFlatDisc) row.push(String(formatCurrency(item.flatDiscount || 0))) // Flat Disc
    row.push(String(formatCurrency(item.amount || 1712121.00)))                       // Amount
    return row
  }) : [
    (() => {
      const defaultRow = [
        "1",
        "AFG10017",
        "FISCHER-ANCHOR-FWA 16X180",  // Product Name
        "",                           // Description (empty)
        "18%",
        "1",
        "Nos",
        String(formatCurrency(1712121.00))
      ]
      if (!hiddenColumns.hideDisc) defaultRow.push("0%")
      if (!hiddenColumns.hideFlatDisc) defaultRow.push(String(formatCurrency(0)))
      defaultRow.push(String(formatCurrency(1712121.00)))
      return defaultRow
    })()
  ]

  // FIXED: Column styles with Product Name column
  const getColumnStyles = () => {
    const availableWidth = pageWidth - 2 * margin - 2

    const styles = {
      0: { cellWidth: 8, halign: 'center' },   // S.No
      1: { cellWidth: 15, halign: 'center' },  // Code  
      2: { cellWidth: 35, halign: 'left' },    // Product Name
      3: { cellWidth: 30, halign: 'left' },    // Description
      4: { cellWidth: 10, halign: 'center' },  // GST%
      5: { cellWidth: 8, halign: 'center' },   // Qty
      6: { cellWidth: 10, halign: 'center' },  // Units
      7: { cellWidth: 18, halign: 'right' },   // Rate
    }

    let columnIndex = 8
    let usedWidth = 8 + 15 + 35 + 30 + 10 + 8 + 10 + 18 // 134mm used

    if (!hiddenColumns.hideDisc) {
      styles[columnIndex] = { cellWidth: 10, halign: 'center' } // Disc%
      usedWidth += 10
      columnIndex++
    }
    if (!hiddenColumns.hideFlatDisc) {
      styles[columnIndex] = { cellWidth: 15, halign: 'right' } // Flat Disc
      usedWidth += 15
      columnIndex++
    }

    // Amount column gets remaining width
    const remainingWidth = availableWidth - usedWidth
    styles[columnIndex] = {
      cellWidth: Math.max(18, remainingWidth - 2),
      halign: 'right',
      fontStyle: 'bold'
    }

    return styles
  }

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: itemsData,
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - 2 * margin,
    styles: {
      fontSize: 6.5, // Even smaller font for all columns to fit
      cellPadding: 1,
      overflow: 'linebreak',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      font: 'helvetica',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [230, 240, 255],
      textColor: [0, 50, 100],
      fontSize: 6.5,
      fontStyle: 'bold',
      cellPadding: 1.5,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: getColumnStyles(),
    theme: 'grid',
    tableLineWidth: 0.2,
    tableLineColor: [0, 0, 0],
    willDrawCell: function (data) {
      if (data.cell.x + data.cell.width > pageWidth - margin) {
        data.cell.width = pageWidth - margin - data.cell.x - 1;
      }
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y;
    },
  });

  currentY = doc.lastAutoTable.finalY + 10

  // FIXED: Financial summary with correct tax calculation
  // FIXED: Financial summary with proper page break handling
  const summaryWidth = 60
  const summaryX = pageWidth - margin - summaryWidth

  // Use actual data from quotationData for correct tax calculation
  const subtotal = quotationData.subtotal || 0
  const totalFlatDiscount = quotationData.totalFlatDiscount || 0
  const taxableAmount = Math.max(0, subtotal - totalFlatDiscount)

  // Check if IGST or CGST+SGST should be used
  const isIGST = quotationData.isIGST
  const igstRate = quotationData.igstRate || 18
  const cgstRate = quotationData.cgstRate || 9
  const sgstRate = quotationData.sgstRate || 9

  let taxAmount = 0
  let finalTotal = 0

  // Build summary items based on tax type
  const summaryItems = [
    { label: "Subtotal:", value: String(formatCurrency(subtotal)) }
  ]

  // Add Total Flat Discount if exists and not hidden
  if (!hiddenColumns.hideTotalFlatDisc && totalFlatDiscount > 0) {
    summaryItems.push({
      label: "Total Flat Discount:",
      value: `-${String(formatCurrency(totalFlatDiscount))}`
    })
  }

  // Add Taxable Amount
  summaryItems.push({
    label: "Taxable Amount:",
    value: String(formatCurrency(taxableAmount))
  })

  // Add correct tax based on IGST or CGST+SGST
  if (isIGST) {
    // Use IGST
    const igstAmount = quotationData.igstAmount || (taxableAmount * (igstRate / 100))
    taxAmount = igstAmount
    summaryItems.push({
      label: `IGST (${igstRate}%):`,
      value: String(formatCurrency(igstAmount))
    })
  } else {
    // Use CGST + SGST
    const cgstAmount = quotationData.cgstAmount || (taxableAmount * (cgstRate / 100))
    const sgstAmount = quotationData.sgstAmount || (taxableAmount * (sgstRate / 100))
    taxAmount = cgstAmount + sgstAmount

    summaryItems.push({
      label: `CGST (${cgstRate}%):`,
      value: String(formatCurrency(cgstAmount))
    })
    summaryItems.push({
      label: `SGST (${sgstRate}%):`,
      value: String(formatCurrency(sgstAmount))
    })
  }

  // Add special discount if not hidden and exists
  if (!hiddenColumns.hideSpecialDiscount && specialDiscount > 0) {
    summaryItems.push({
      label: "Special Discount:",
      value: `-${String(formatCurrency(specialDiscount))}`
    })
  }

  // Calculate final total - ALWAYS calculate instead of using quotationData.total
  finalTotal = taxableAmount + taxAmount - (specialDiscount || 0)

  // Add final total
  summaryItems.push({
    label: "Grand Total:",
    value: String(formatCurrency(finalTotal))
  })

  // FIXED: Calculate required height and check for page break
  const summaryHeight = summaryItems.length * 8 + 8

  // Check if summary section will fit on current page, if not add new page
  if (checkSpace(summaryHeight + 10)) {
    // Page was added, adjust summaryX and summaryY for new page
    const summaryY = currentY
  } else {
    const summaryY = currentY
  }

  // Now draw the summary at the correct position
  const summaryY = currentY

  // Draw summary box
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(summaryX, summaryY, summaryWidth, summaryHeight)

  let summaryCurrentY = summaryY + 8

  summaryItems.forEach((item, index) => {
    if (index === summaryItems.length - 1) { // Total row
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setFillColor(230, 240, 255) // Light blue background for total
      doc.rect(summaryX, summaryCurrentY - 3, summaryWidth, 7, "F")
    } else {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
    }

    doc.setTextColor(0, 0, 0)
    doc.text(item.label, summaryX + 3, summaryCurrentY)
    doc.text(item.value, summaryX + summaryWidth - 3, summaryCurrentY, { align: "right" })
    summaryCurrentY += 7
  })

  currentY = summaryCurrentY + 15

  // Check if we need a new page for terms and bank details
  checkSpace(80)

  // Terms & Conditions and Bank Details - FIXED LAYOUT
  const termsBoxHeight = 60 // Reduced height

  // Combined box for both Terms & Conditions and Bank Details sections
  doc.setFillColor(250, 250, 250) // Very light gray background
  doc.rect(margin, currentY, pageWidth - 2 * margin, termsBoxHeight, "F")
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(margin, currentY, pageWidth - 2 * margin, termsBoxHeight)

  // Add vertical separator line between Terms and Bank Details
  const termsSeparatorX = margin + sectionWidth + 7.5
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(termsSeparatorX, currentY, termsSeparatorX, currentY + termsBoxHeight)

  const leftColumnX = margin
  const rightColumnX = margin + sectionWidth + 15
  const columnWidth = sectionWidth - 10

  // Terms & Conditions header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 50, 100) // Dark blue for section headers
  doc.text("Terms & Conditions:", leftColumnX + 5, currentY + 10)

  const terms = [
    { label: "Validity", value: quotationData.validity || "The above quoted prices are valid up to 5 days from date of offer." },
    { label: "Payment Terms", value: quotationData.paymentTerms || "100% advance payment in the mode of NEFT, RTGS & DD" },
    { label: "Delivery", value: quotationData.delivery || "Material is ready in our stock" },
    { label: "Freight", value: quotationData.freight || "Extra as per actual." },
    { label: "Insurance", value: quotationData.insurance || "Transit insurance for all shipment is at Buyer's risk." },
    { label: "Taxes", value: quotationData.taxes || "Extra as per actual." },
  ]

  let termsY = currentY + 15
  doc.setFontSize(7) // Smaller font for better fit

  terms.forEach((term) => {
    if (termsY < currentY + termsBoxHeight - 5) {
      // Label in bold
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text(`${term.label}:`, leftColumnX + 5, termsY)

      // Value in normal font with proper spacing
      doc.setFont("helvetica", "normal")
      const labelWidth = 25 // Reduced width for better fit
      const wrappedLines = wrapText(term.value, columnWidth - labelWidth - 5)

      wrappedLines.forEach((line, index) => {
        if (termsY + (index * 2.5) < currentY + termsBoxHeight - 3) {
          doc.text(line, leftColumnX + 5 + labelWidth, termsY + (index * 2.5))
        }
      })

      termsY += Math.max(4, wrappedLines.length * 2.5) + 1
    }
  })

  // Bank Details header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(0, 50, 100) // Dark blue for section headers
  doc.text("Bank Details:", rightColumnX + 5, currentY + 10)

  const bankDetails = [
    { label: "Account No", value: String(quotationData.accountNo || "438605000447") },
    { label: "Bank Name", value: String(quotationData.bankName || "ICICI BANK") },
    { label: "Bank Address", value: String(quotationData.bankAddress || "FAFADHI, RAIPUR") },
    { label: "IFSC Code", value: String(quotationData.ifscCode || "ICIC0004386") },
    { label: "Email", value: String(quotationData.email || "Support@thedivineempire.com") },
    { label: "Website", value: String(quotationData.website || "www.thedivineempire.com") },
    { label: "PAN", value: String(quotationData.pan || "AAGCD9326H") },
  ]

  let bankY = currentY + 15
  doc.setFontSize(7) // Smaller font for better fit

  bankDetails.forEach((detail) => {
    if (bankY < currentY + termsBoxHeight - 5) {
      // Label in bold
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text(`${detail.label}:`, rightColumnX + 5, bankY)

      // Value in normal font with proper spacing
      doc.setFont("helvetica", "normal")
      const labelWidth = 25 // Reduced width for better fit
      const wrappedLines = wrapText(String(detail.value || ""), columnWidth - labelWidth - 5)

      wrappedLines.forEach((line, index) => {
        if (bankY + (index * 2.5) < currentY + termsBoxHeight - 3) {
          doc.text(line, rightColumnX + 5 + labelWidth, bankY + (index * 2.5))
        }
      })

      bankY += Math.max(4, wrappedLines.length * 2.5) + 1
    }
  })

  currentY += termsBoxHeight + 15

  // Signature section
  const signatureY = currentY
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Prepared By: ${quotationData.preparedBy || "GEETA BHIWAGADE"}`, margin, signatureY)

  // Draw line for signature
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(pageWidth - margin - 80, signatureY + 10, pageWidth - margin - 10, signatureY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("Authorized Signature", pageWidth - margin - 45, signatureY + 20, { align: "center" })

  // Special offers section (if exists and not hidden)
  if (quotationData.specialOffers && quotationData.specialOffers.filter((offer) => offer.trim()).length > 0) {
    currentY += 25
    checkSpace(25)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(0, 50, 100)
    doc.text("DIVINE EMPIRE'S 10TH ANNIVERSARY SPECIAL OFFER", margin, currentY)
    currentY += 6

    quotationData.specialOffers
      .filter((offer) => offer.trim())
      .forEach((offer) => {
        doc.setTextColor(200, 50, 50)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        const text = `★ ${offer}`
        const wrappedLines = wrapText(text, pageWidth - 2 * margin)
        wrappedLines.forEach((line) => {
          doc.text(line, margin, currentY)
          currentY += 4
        })
      })
  }

  // Additional notes section (if exists)
  if (quotationData.notes && quotationData.notes.length > 0) {
    currentY += 10
    checkSpace(20)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(0, 50, 100)
    doc.text("ADDITIONAL NOTES", margin, currentY)
    currentY += 6

    quotationData.notes
      .filter((note) => note.trim())
      .forEach((note) => {
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        const text = `• ${note}`
        const wrappedLines = wrapText(text, pageWidth - 2 * margin)
        wrappedLines.forEach((line) => {
          doc.text(line, margin, currentY)
          currentY += 4
        })
      })
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Add main document border on each page
    addMainBorder()

    doc.setFontSize(6)
    doc.setTextColor(120, 120, 120)
    doc.setFont("helvetica", "normal")

    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" })

    doc.text("Generated by Divine Empire Professional Quotation System", margin, pageHeight - 10)
    doc.text("This is a computer-generated document", margin, pageHeight - 6)

    const now = new Date()
    doc.text(`Generated on: ${now.toLocaleDateString('en-GB')}, ${now.toLocaleTimeString()}`, pageWidth - margin, pageHeight - 10, { align: "right" })
  }

  return doc.output("datauristring").split(",")[1]
}