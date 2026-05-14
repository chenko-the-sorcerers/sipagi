export const recipePlanningSource = {
    name: 'junwatu/indonesian-recipes',
    url: 'https://huggingface.co/datasets/junwatu/indonesian-recipes',
    schema: ['title', 'ingredients', 'steps', 'num_ingredients', 'num_steps', 'char_count'],
    importExample: 'from datasets import load_dataset; ds = load_dataset("junwatu/indonesian-recipes")'
};

export const recipePlanningCatalog = [
    {
        title: 'Nasi Ayam Katsu Saus Barbeque',
        ingredients: ['beras', 'ayam fillet', 'tepung panir', 'telur', 'saus barbeque', 'wortel', 'buncis'],
        steps: ['Masak nasi', 'Balur ayam dengan tepung dan telur', 'Goreng ayam sampai matang', 'Sajikan dengan saus dan sayur rebus'],
        protein: 'ayam fillet',
        note: 'Menu tinggi protein yang mudah diporsikan untuk sekolah.'
    },
    {
        title: 'Nasi Telur Balado Tempe Orek',
        ingredients: ['beras', 'telur', 'tempe', 'cabai merah', 'bawang merah', 'bawang putih', 'timun'],
        steps: ['Masak nasi', 'Rebus dan balado telur', 'Masak tempe orek', 'Tambahkan lalap timun'],
        protein: 'telur dan tempe',
        note: 'Alternatif ekonomis dengan protein hewani dan nabati.'
    },
    {
        title: 'Nasi Ikan Dori Katsu Sayur Sop',
        ingredients: ['beras', 'ikan dori', 'tepung panir', 'wortel', 'kentang', 'kol', 'seledri'],
        steps: ['Masak nasi', 'Goreng ikan berbalut tepung', 'Masak sop sayur', 'Porsi sesuai target usia'],
        protein: 'ikan dori',
        note: 'Cocok untuk variasi menu ikan dengan tekstur ramah anak.'
    },
    {
        title: 'Nasi Ayam Kecap Tumis Buncis',
        ingredients: ['beras', 'ayam', 'kecap manis', 'buncis', 'wortel', 'bawang bombai'],
        steps: ['Masak nasi', 'Masak ayam kecap sampai suhu aman', 'Tumis buncis wortel', 'Packing panas terkontrol'],
        protein: 'ayam',
        note: 'Menu rumahan yang stabil untuk produksi batch besar.'
    },
    {
        title: 'Nasi Kuning Telur Dadar Perkedel',
        ingredients: ['beras', 'kunyit', 'santan', 'telur', 'kentang', 'wortel', 'mentimun'],
        steps: ['Masak nasi kuning', 'Buat telur dadar lembar', 'Goreng perkedel', 'Tambahkan sayur pendamping'],
        protein: 'telur',
        note: 'Menu variasi karbohidrat dengan komponen mudah distandarkan.'
    }
];
