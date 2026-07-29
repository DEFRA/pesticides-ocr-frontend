export const homeController = {
  handler(_request, h) {
    const links = {
      userGuidance: 'https://www.gov.uk/government/publications/professional-plant-protection-products-ppps-register-as-a-user/how-to-register-as-a-user-of-professional-plant-protection-products-ppps-and-adjuvants',
      marketGuidance: 'https://www.gov.uk/government/publications/professional-plant-protection-products-ppps-register-as-a-business-that-places-them-on-the-market/how-to-register-as-a-business-that-places-professional-plant-protection-products-ppps-on-the-market',
      sellerGuidance: 'https://www.gov.uk/government/publications/amateur-plant-protection-products-ppps-register-as-a-seller/how-to-register-as-a-business-that-sells-amateur-plant-protection-products-ppps'
    }
    return h.view('home/index', { links })
  }
}
