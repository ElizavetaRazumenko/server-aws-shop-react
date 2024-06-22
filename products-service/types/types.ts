export type Product = {
    id: string;
    title: string;
    description: string;
    price: number;
}

export type Stock = {
    product_id: string;
    count: number
}

export type ProductWithStock = Product & Omit<Stock, 'product_id'>