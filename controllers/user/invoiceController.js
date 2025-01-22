const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const PDFDocument = require('pdfkit');
const path = require('path');
const statusCodes = require("../../utils/statusCodes")



const invoiceDownload = async (req, res) => {
    try {
        const { id } = req.query;
        

        const order = await Order.findOne({orderId:id}).populate('orderedItems.product');
        if (!order) {
            return res.status(statusCodes.NOT_FOUND).send("Order not found");
        }
        
        let address = order.shippingAddress;
    

        const doc = new PDFDocument({ margin: 50 });
        const filename = `invoice-${order.orderId}.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        // Generate invoice sections
        generateHeader(doc);
        doc.moveDown();

        generateCustomerInformation(doc, order, address);
        doc.moveDown();

        generateInvoiceTable(doc, order);
        doc.moveDown();

        generateFooter(doc, order);

        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(statusCodes.INTERNAL_SERVER_ERROR).send("Error generating invoice");
    }
};


const generateHeader = (doc) => {
    doc
        .image("C:/Users/jjoel/Desktop/firstproject/public/evara-user/assets/imgs/theme/logoo.png", 50, 45, { width: 50 })
        .fillColor('#444444')
        .fontSize(20)
        .text('Gadget Verse', 110, 57)
        .fontSize(10)
        .text('Gadget Verse', 200, 50, { align: 'right' })
        .moveDown();

    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, 90)
        .lineTo(550, 90)
        .stroke();
};

const generateCustomerInformation = (doc, order, address) => {
    const customerInfoTop = 100;

    doc
        .fontSize(16)
        .text('Invoice', 50, customerInfoTop)
        .fontSize(10)
        .text(`Invoice No.: ${order.orderId}`, 50, customerInfoTop + 30)
        .text(`Invoice Date: ${new Date(order.createdOn).toLocaleDateString()}`, 50, customerInfoTop + 45)

        .text('Bill To:', 300, customerInfoTop + 30)
        .font('Helvetica-Bold')
        .text(address.name, 300, customerInfoTop + 45)
        .font('Helvetica')
        .text(address.addressType, 300, customerInfoTop + 60)
        .text(`${address.city}, ${address.state} - ${address.pincode}`, 300, customerInfoTop + 75)
        .text(`Phone: ${address.phone}`, 300, customerInfoTop + 90)
        .moveDown();

    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, customerInfoTop + 110)
        .lineTo(550, customerInfoTop + 110)
        .stroke();
};

const generateInvoiceTable = (doc, order) => {
    const tableTop = 250;

    doc
        .fontSize(10)
        .text('Serial No.', 50, tableTop,{ width: 60 })
        .text('Item', 150, tableTop,{ width: 150, align: 'left' })
        .text('Unit Price', 280, tableTop, { width: 90, align: 'right' })
        .text('Quantity', 370, tableTop, { width: 90, align: 'right' })
        .text('Line Total', 470, tableTop, { width: 90, align: 'right' });

    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

    let position = 0;
    order.orderedItems.forEach((item, index) => {
        position = tableTop + 30 + (index * 30);

        doc
            .fontSize(10)
            .text(`${index + 1}`, 60, position)
            .text(item.product.productName, 150, position,{width:180})
            .text("Rs. " + item.price.toLocaleString(), 280, position, { width: 90, align: 'right' })
            .text(item.quantity.toString(), 370, position, { width: 90, align: 'right' })
            .text("Rs. " + (item.quantity * item.price).toLocaleString(), 470, position, { width: 90, align: 'right' });
    });

    const subtotalPosition = position + 30;
    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, subtotalPosition)
        .lineTo(550, subtotalPosition)
        .stroke();

    doc
        .fontSize(10)
        .text('Subtotal:', 380, subtotalPosition + 15)
        .text("Rs. " + order.totalPrice.toLocaleString(), 470, subtotalPosition + 15, { width: 90, align: 'right' })
        .text('Discount:', 380, subtotalPosition + 30)
        .text("Rs. " + order.discount.toLocaleString(), 470, subtotalPosition + 30, { width: 90, align: 'right' })
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', 380, subtotalPosition + 45)
        .text("Rs. " + order.finalAmount.toLocaleString(), 470, subtotalPosition + 45, { width: 90, align: 'right' });
};

const generateFooter = (doc, order) => {
    doc
        .fontSize(10)
        .text('Payment Status:', 50, 700)
        .fillColor(order.paymentStatus === 'Completed' ? '#008000' : '#FF0000')
        .text(order.paymentStatus, 150, 700)
        .fillColor('#444444')
        .text('Shipment Status:', 50, 715)
        .text(order.status, 150, 715)
        .fontSize(10)
        .text('Thank you for your business. For any queries, please contact support@ChronoCraft.com', 50, 750, { align: 'center' });
};


module.exports = {
    invoiceDownload
};