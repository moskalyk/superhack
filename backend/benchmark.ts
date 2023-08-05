const wait = async (ms) => {
    return new Promise((res) => setTimeout(res, ms))
}
(async () => {
    let start = Date.now()
    const times = []
    for(let i = 0; i <= 255; i++){
        const res = await fetch('http://localhost:4000/quote')
        const json = await res.json()
        console.log(json)
        if(json.status == 500) i = 0
        times.push(json.tx)
        await wait(1000)
        console.log(i)
    }
    let end = Date.now()
    console.log(end - start)
    console.log('max', Math.max(...times))
    console.log('min', Math.min(...times))
})()