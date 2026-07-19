export default async function handler(req, res) {

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({
            error: "Destination is required"
        });
    }

    try {

        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6`,
            {
                headers: {
                    Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Failed to fetch images"
            });
        }

        const images = data.results.map(image => image.urls.regular);

        return res.status(200).json(images);

    } catch (error) {

        return res.status(500).json({
            error: "Internal Server Error"
        });

    }

}