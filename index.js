let http = require('http');
const url = require('url');
const fetch = require('node-fetch');
const removeAll = require("./utils").removeAll;

http.createServer(function (request, response) {
    // res.write('Hello World!'); //write a response to the client
    // res.end(); //end the response

    switch (request.method) {
        case "GET":
            parseGET(request, response);
            break;

        case "POST":
            break;

        default:
            response.writeHead(501, "Not implemented 2");
            response.write(JSON.stringify({"Error": "Invalid method"}));
            response.end();
            break;
    }

})
    .listen(8080); //the server object listens on port 8080

async function parseGET(request, response) {
    const action = url.parse(request.url, false).pathname;
    console.log("Action received: \t", action);
    let aux, body;

    switch (action) {

        case "/cookie":
            let cookie = await getCookie();
            response.writeHead(200);
            response.end(JSON.stringify({
                "Cookie": cookie
            }));
            break;

        case "/distritos":
            aux = await getDistritos();
            response.writeHead(200);
            response.write(JSON.stringify({
                "Distritos": aux
            }));
            response.end();
            break;

        case "/concelhos":
            body = "";

            request
                .on("data", (chunk) => {
                    body += chunk;
                })

                .on('end', async () => {
                    try {
                        body = JSON.parse(body);
                        //TODO sanitize ID


                        response.writeHead(200);
                        response.end(JSON.stringify({
                            "concelhos": await getConcelhos(body.id)
                        }));

                    } catch (error) {
                        response.writeHead(501);
                        console.log("error:\t", error.toString())
                        response.end(error);
                    }
                })

                .on('error', (error) => {
                    console.log("JSON error");
                    response.writeHead(401);
                    response.write(JSON.stringify({"error": "Invalid post request"}));
                    response.end();
                    throw error;
                });

            break;

        // case "/fuels":
        //     aux = await getFuelTypes(await getCookie().Cookie);
        //     response.writeHead(200);
        //     response.write(JSON.stringify({
        //         "tipos": aux
        //     }));
        //     response.end();
        //     break;

        case "/searchInfo":
            let text = await getSearchInfo(await getCookie());
            // console.log(text);
            response.writeHead(200);
            response.write(JSON.stringify({
                "tiposComb": parsing(text, "tipoCombustivel"),
                "marcas": parsing(text, "marca"),
                "tiposPostos": parsing(text, "tipoPosto"),
            }));
            response.end();
            break;

        case "/search":
            body = "";

            request
                .on("data", (chunk) => {
                    body += chunk;
                })

                .on('end', async () => {
                    try {
                        body = JSON.parse(body);
                        //TODO sanitize values

                        // console.log("Body:\t", body);
                        let cookie = await getCookie();
                        // console.log("Cookie:\t", cookie);
                        if (cookie !== undefined) {
                            let presearch = await getPreSearchParams(cookie, body);
                            // console.log("Presearch:\t", presearch);
                            if (presearch.np !== undefined && presearch.rid !== undefined) {
                                let results = await getResults(presearch.np, presearch.rid, cookie);
                                // console.log("Result:\t", results);
                                response.writeHead(200);
                                response.end(JSON.stringify({
                                    "results": resultsPretty(results)
                                }));
                                return;
                            }
                        }
                        response.writeHead(500);
                        response.end();
                    } catch (error) {
                        response.writeHead(501);
                        response.end(error);
                    }
                })

                .on('error', (error) => {
                    console.log("JSON error");
                    response.writeHead(401);
                    response.write(JSON.stringify({"error": "Invalid post request"}));
                    response.end();
                    throw error;
                });

            break;

        default:
            response.writeHead(400);
            response.write("Invalid action");
            response.end();
    }

}


async function getCookie() {
    return fetch("http://www.precoscombustiveis.dgeg.pt/", {
        method: "GET"
    })
        .then(resp => resp.text())
        .then(text => text.toString().split("mlkid=")[1].split('\'')[0])
        // .then(text => {
        //     console.log(text.toString().split("mlkid=")[1].split('\'')[0])
        //     return text.toString().split("mlkid=")[1].split('\'')[0]
        // })
        .catch(error => console.log("dataCookie error:\t", error));
}

async function getDistritos() {
    return fetch("http://www.precoscombustiveis.dgeg.pt/include/mapaPT.js", {
        method: "GET",
    })
        .then(response => response.text())
        .then(text => {
            let options = text.split("zonas[0]")[1].split("mlkMapaDOM = zonas;")[0].split("zonas");
            let distritos = [];
            for (let i = 1; i < options.length && i <= 18; i++) {
                distritos.push({
                    id: removeAll(options[i].toString().split("]=")[1].split(";")[0].split("id:")[1].split(",")[0], ["'"]),
                    value: removeAll(options[i].toString().split("]=")[1].split(";")[0].split("nome:")[1].split(",")[0], ["'"])
                });
            }
            return distritos;
        })
        .catch(error => console.log("Distritos error:\t" + error));
}

async function getConcelhos(distritoID) {
    return fetch("http://www.precoscombustiveis.dgeg.pt/include/mapaPTCB.aspx", {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        body: "mid=D" + distritoID + "&mh=3",
    })
        .then(response => response.text())
        .then(text => {
            const options = text.toString().split("zonas");
            let concelhos = [];
            for (let i = 3; i < options.length; i++) {
                concelhos.push({
                    id: removeAll(options[i].toString().split("id:")[1].split(",")[0], ["'"]),
                    value: removeAll(options[i].toString().split("nome:")[1].split(",")[0], ["'"])
                });
            }
            return concelhos;
        })
        .catch(error => console.log("Concelhos error:\t" + error));
}

async function getSearchInfo(cookie) {
    return fetch("http://www.precoscombustiveis.dgeg.pt/pagina.aspx", {
        method: "GET",
        headers: {
            "cookie": "mlkid=" + cookie
        }
    })
        .then(resp => resp.text())
        .catch(error => console.log("getSearchInfo error:\t", error));
}

// function parseFuelTypes(text) {
//
//     // console.log("Text:\t", text);
//     const options = text.toString().split("id=\"tipoCombustivel\"")[1].split("</select>")[0].split("<option");
//     let types = [];
//
//     for (let i = 1; i < options.length; i++) {
//         types.push({
//             id: removeAll(options[i].toString().split("value=")[1].split(">")[0], ["\"", "SELECTED"]),
//             value: options[i].toString().split(">")[1].split("<")[0]
//         });
//     }
//     console.log(types);
//     return types;
//
// }

// function parseBrands(text) {
//
//     // console.log("Text:\t", text);
//     const options = text.toString().split("id=\"marca\"")[1].split("</select>")[0].split("<option");
//     let types = [];
//
//     for (let i = 1; i < options.length; i++) {
//         types.push({
//             id: removeAll(options[i].toString().split("value=")[1].split(">")[0], ["\""]),
//             value: options[i].toString().split(">")[1].split("<")[0]
//         });
//     }
//
//     return types;
// }

// function parseTipoPostos(text) {
//
//     // console.log("Text:\t", text);
//     const options = text.toString().split("id=\"tipoPosto\"")[1].split("</select>")[0].split("<option");
//     let types = [];
//
//     for (let i = 1; i < options.length; i++) {
//         types.push({
//             id: removeAll(options[i].toString().split("value=")[1].split(">")[0], ["\""]),
//             value: options[i].toString().split(">")[1].split("<")[0]
//         });
//     }
//
//     return types;
// }


async function getPreSearchParams(cookie, json) {

    // dict["codComb"] = "G5187C5502";
    // dict["codMarca"] = "G5187C5503";
    // dict["tipoPosto"] = "G5187C5504";
    // dict["concelhos"] = "G5187C5505"
    //

    // console.log("Veio:\t", json);

    let data = "EstagioID=5188&bExecutarEventos=False&";

    // TODO sanitize

    data += (json.tipoComb === '' ? '' : 'G5187C5502=' + json.tipoComb);
    data += (json.marca === '' ? '' : '&G5187C5503=' + json.marca);
    data += (json.tipoposto === '' ? '' : '&G5187C5504=' + json.tipoposto);
    data += (json.concelho === '' ? '' : '&G5187C5505=' + json.concelho);

    // console.log("Final data: \t", data);

    return fetch("http://www.precoscombustiveis.dgeg.pt/include/criarRegistoCB.aspx", {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded;",
            "cookie": "mlkid=" + cookie
        },
        body: data,
    })
        .then(resp => resp.text())
        .then(text => {
            return {
                "rid": text.split(";")[1].split("rid=")[1],
                "np": text.split(";")[0].split("np=")[1],
            }
        })
        .catch(error => console.log("Error 2:\t", error));
}

async function getResults(np, rid, cookie) {

    return fetch("http://www.precoscombustiveis.dgeg.pt/pagina.aspx?" +
        "f=2&" +
        "cn=62796281AAAAAAAAAAAAAAAA&" +
        "regniu=7747&" +
        "regformid=5044&" +
        "regestagioid=5188&" +
        "regnumprocesso=" + np + "&" +
        "regtipo=S&" +
        "regbloco=7747&" +
        "regrespostaid=" + rid + "&" +
        "posicionar=&" +
        "g7745n0nrec=500",
        {
            method: "GET",
            headers: {
                "cookie": "mlkid=" + cookie
            }
        })
        .then(resp => resp.text())
        .catch(error => console.log("Error 3:\t", error));
}


// https://www.precoscombustiveis.dgeg.pt/include/geral.js
let dict = {};
dict["codComb"] = "G5187C5502";
dict["codMarca"] = "G5187C5503";
dict["tipoPosto"] = "G5187C5504";
dict["concelhos"] = "G5187C5505"

function parsing(text, parameter) {
    console.log("Text:\t", text);
    const options = text
        .toString()
        .split("id=\"" + parameter + "\"")[1]
        .split("</select>")[0]
        .split("<option");
    let types = [];

    for (let i = 1; i < options.length; i++) {
        types.push({
            id: removeAll(options[i].toString().split("value=")[1].split(">")[0], ["\""]),
            value: options[i].toString().split(">")[1].split("<")[0]
        });
    }

    return types;
}

function resultsPretty(text) {

    let infoPostos = [];

    const rows = text.split("class=TabelaGeral")[1].split("</tbody")[0].split("trPar");

    for (let i = 2; i < rows.length; i++) {

        let td = rows[i].split("text-align:");

        // if (i === 2) {
        //     // console.log("TD:\t", td);
        //     // console.log(td[0]);
        //     console.log(td[0].split("listagemAF")[1].split(";")[0].split(","));
        // }

        infoPostos.push({
            "id1": removeAll(td[0].split("listagemAF")[1].split(";")[0].split(",")[1], ["\'", " "]),
            "id2": removeAll(td[0].split("listagemAF")[1].split(";")[0].split(",")[2], ["\'", " "]),
            "id3": removeAll(td[0].split("listagemAF")[1].split(";")[0].split(",")[3], ["\'", " "]),
            "id4": removeAll(td[0].split("listagemAF")[1].split(";")[0].split(",")[4], ["\'", " ", ")"]),
            "nome": removeAll(td[1].split(">")[1].split("</div")[0], ["\n", "\r"]),
            "tipo": removeAll(td[2].split(">")[1].split("</div")[0], ["\n", "\r"]),
            "concelho": removeAll(td[3].split(">")[1].split("</div")[0], ["\n", "\r"]),
            "preco": removeAll(td[4].split(">")[1].split("</div")[0], ["\n", "\r"]),
            "marca": removeAll(td[5].split(">")[1].split("</div")[0], ["\n", "\r"]),
            "combustivel": removeAll(td[6].split(">")[1].split("</div")[0], ["\n", "\r"]),
            "data": removeAll(td[7].split(">")[1].split("</div")[0], ["\n", "\r"]),
        });

        // console.log("AUX:\t", infoPostos[infoPostos.length - 1]);
    }

    // console.log("HERE down:\t", infoPostos);
    return infoPostos;
}
