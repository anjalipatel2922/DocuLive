function calculateDiscount(price, discountPercent) {
    if (price < 0 || discountPercent < 0 || discountPercent > 100) {
        throw new Error("Invalid price or discount");
    }

    return price - (price * discountPercent / 100);
}

module.exports = { calculateDiscount };