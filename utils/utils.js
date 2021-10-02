async function discordRequest(url) {
    try {
        let res = await axios.get(url, {headers: headers})
        return res.data
    } catch (err) {
        
    }
}