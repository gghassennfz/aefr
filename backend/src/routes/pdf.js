const express = require('express');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Template de facture
const invoiceTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Facture {{invoice_number}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-info h1 { color: #2563eb; margin: 0; }
        .invoice-info { text-align: right; }
        .client-info { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .items-table th { background-color: #f8f9fa; }
        .totals { text-align: right; margin-top: 20px; }
        .total-line { display: flex; justify-content: space-between; margin: 5px 0; }
        .total-amount { font-weight: bold; font-size: 1.2em; }
        .footer { margin-top: 40px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>{{business.name}}</h1>
            <p>{{business.address}}<br>
            {{business.postal_code}} {{business.city}}<br>
            SIRET: {{business.siret}}<br>
            Email: {{business.email}}</p>
        </div>
        <div class="invoice-info">
            <h2>FACTURE N° {{invoice_number}}</h2>
            <p>Date: {{issue_date}}<br>
            Échéance: {{due_date}}</p>
        </div>
    </div>

    <div class="client-info">
        <h3>Facturé à:</h3>
        <p><strong>{{client.name}}</strong><br>
        {{client.address}}<br>
        {{client.postal_code}} {{client.city}}<br>
        {{#if client.siret}}SIRET: {{client.siret}}<br>{{/if}}
        Email: {{client.email}}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix unitaire HT</th>
                <th>Total HT</th>
                {{#if business.vat_number}}<th>TVA</th><th>Total TTC</th>{{/if}}
            </tr>
        </thead>
        <tbody>
            {{#each items}}
            <tr>
                <td>{{description}}</td>
                <td>{{quantity}}</td>
                <td>{{unit_price}}€</td>
                <td>{{subtotal}}€</td>
                {{#if ../business.vat_number}}
                <td>{{vat_rate}}%</td>
                <td>{{total}}€</td>
                {{/if}}
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-line">
            <span>Total HT:</span>
            <span>{{subtotal}}€</span>
        </div>
        {{#if business.vat_number}}
        <div class="total-line">
            <span>Total TVA:</span>
            <span>{{vat_amount}}€</span>
        </div>
        {{/if}}
        <div class="total-line total-amount">
            <span>Total {{#if business.vat_number}}TTC{{else}}HT{{/if}}:</span>
            <span>{{total}}€</span>
        </div>
    </div>

    <div class="footer">
        <p><strong>Conditions de paiement:</strong> {{payment_terms || 'Paiement à réception'}}</p>
        {{#unless business.vat_number}}
        <p><em>TVA non applicable, art. 293 B du CGI</em></p>
        {{/unless}}
        <p><strong>Pénalités de retard:</strong> 3 fois le taux d'intérêt légal</p>
        <p><strong>Indemnité forfaitaire pour frais de recouvrement:</strong> 40€</p>
    </div>
</body>
</html>
`;

// Template de devis
const quoteTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Devis {{quote_number}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-info h1 { color: #2563eb; margin: 0; }
        .quote-info { text-align: right; }
        .client-info { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .items-table th { background-color: #f8f9fa; }
        .totals { text-align: right; margin-top: 20px; }
        .total-line { display: flex; justify-content: space-between; margin: 5px 0; }
        .total-amount { font-weight: bold; font-size: 1.2em; }
        .footer { margin-top: 40px; font-size: 0.9em; color: #666; }
        .validity { background-color: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>{{business.name}}</h1>
            <p>{{business.address}}<br>
            {{business.postal_code}} {{business.city}}<br>
            SIRET: {{business.siret}}<br>
            Email: {{business.email}}</p>
        </div>
        <div class="quote-info">
            <h2>DEVIS N° {{quote_number}}</h2>
            <p>Date: {{issue_date}}<br>
            Validité: {{expiry_date}}</p>
        </div>
    </div>

    <div class="client-info">
        <h3>Destinataire:</h3>
        <p><strong>{{client.name}}</strong><br>
        {{client.address}}<br>
        {{client.postal_code}} {{client.city}}<br>
        Email: {{client.email}}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix unitaire HT</th>
                <th>Total HT</th>
                {{#if business.vat_number}}<th>TVA</th><th>Total TTC</th>{{/if}}
            </tr>
        </thead>
        <tbody>
            {{#each items}}
            <tr>
                <td>{{description}}</td>
                <td>{{quantity}}</td>
                <td>{{unit_price}}€</td>
                <td>{{subtotal}}€</td>
                {{#if ../business.vat_number}}
                <td>{{vat_rate}}%</td>
                <td>{{total}}€</td>
                {{/if}}
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-line">
            <span>Total HT:</span>
            <span>{{subtotal}}€</span>
        </div>
        {{#if business.vat_number}}
        <div class="total-line">
            <span>Total TVA:</span>
            <span>{{vat_amount}}€</span>
        </div>
        {{/if}}
        <div class="total-line total-amount">
            <span>Total {{#if business.vat_number}}TTC{{else}}HT{{/if}}:</span>
            <span>{{total}}€</span>
        </div>
    </div>

    <div class="validity">
        <strong>⏰ Validité du devis:</strong> Ce devis est valable jusqu'au {{expiry_date}}
    </div>

    {{#if notes}}
    <div style="margin: 20px 0;">
        <h4>Notes:</h4>
        <p>{{notes}}</p>
    </div>
    {{/if}}

    <div class="footer">
        {{#unless business.vat_number}}
        <p><em>TVA non applicable, art. 293 B du CGI</em></p>
        {{/unless}}
        <p>Merci de nous retourner ce devis signé et daté avec la mention "Bon pour accord"</p>
    </div>
</body>
</html>
`;

// Générer PDF de facture
router.post('/invoice', async (req, res) => {
  try {
    const data = req.body;
    
    // Compiler le template
    const template = handlebars.compile(invoiceTemplate);
    const html = template(data);
    
    // Générer le PDF
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html);
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
    });
    
    await browser.close();
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${data.invoice_number}.pdf"`
    });
    
    res.send(pdf);
  } catch (error) {
    console.error('Erreur génération PDF facture:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
  }
});

// Générer PDF de devis
router.post('/quote', async (req, res) => {
  try {
    const data = req.body;
    
    // Compiler le template
    const template = handlebars.compile(quoteTemplate);
    const html = template(data);
    
    // Générer le PDF
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html);
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
    });
    
    await browser.close();
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="devis-${data.quote_number}.pdf"`
    });
    
    res.send(pdf);
  } catch (error) {
    console.error('Erreur génération PDF devis:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
  }
});

module.exports = router;
