/* ==========================================================
   CONFIG
========================================================== */

const STORAGE_KEY = "wedding_guest_list";


const BASE_URL =
    window.location.origin +
    "/inv/bayu/index_bayu2.html";



/* ==========================================================
   STORAGE
========================================================== */


function getGuestList() {

    return JSON.parse(

        localStorage.getItem(STORAGE_KEY)

    ) || [];

}



function saveGuestList(data) {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(data)

    );

}



/* ==========================================================
   SEND WHATSAPP
========================================================== */


const sendButton =
    document.getElementById("sendWA");



if (sendButton) {


    sendButton.addEventListener("click", () => {


        const name =
            document
            .getElementById("guestName")
            .value
            .trim();



        const group =
            document
            .getElementById("guestGroup")
            .value
            .trim();



        if (name === "") {

            alert("Nama tamu wajib diisi");

            return;

        }



        if (group === "") {

            alert("Kelompok wajib diisi");

            return;

        }



        const guests =
            getGuestList();



        guests.push({

            id: Date.now(),

            name: name,

            group: group,

            status: "sent",

            created_at: new Date()
                .toLocaleString()

        });



        saveGuestList(guests);



const message = `Kepada Yth.
Bapak/Ibu/Saudara/i ${name}

Dengan penuh rasa bahagia, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam acara pernikahan kami:

Shania & Bayu

Besar harapan kami atas kehadiran dan doa restu Bapak/Ibu/Saudara/i untuk mengiringi awal perjalanan baru kami.

Informasi lengkap mengenai acara dapat dilihat melalui tautan berikut:

${BASE_URL}

Merupakan kebahagiaan bagi kami dapat berbagi momen istimewa ini bersama Anda.

Terima kasih atas perhatian dan doa restunya. 🤍`;



        window.open(

            "https://wa.me/?text=" +
            encodeURIComponent(message),

            "_blank"

        );



        document
            .getElementById("guestName")
            .value = "";



        document
            .getElementById("guestGroup")
            .value = "";



        renderGuestList();


    });


}



/* ==========================================================
   LIST TAMU
========================================================== */


function renderGuestList() {


    const container =
        document.getElementById("guestList");



    if (!container) return;



    const guests =
        getGuestList();



    if (guests.length === 0) {

        container.innerHTML =
            "Belum ada undangan dikirim.";

        return;

    }



    let html = "";



    guests
        .reverse()
        .forEach((guest, index) => {


            html += `

<div class="guest-item">


    <div>

        <h3>
            ${guest.name}
        </h3>

        <p>
            ${guest.group}
        </p>

        <small>
            ${guest.created_at}
        </small>

    </div>



    <button
        class="btn btn-danger delete-guest"
        data-id="${guest.id}">

        Hapus

    </button>


</div>

`;


        });



    container.innerHTML = html;


}




/* ==========================================================
   INIT
========================================================== */


renderGuestList();

/* ==========================================================
   DELETE TAMU
========================================================== */

function deleteGuest(id) {

    let guests = getGuestList();


    guests = guests.filter(

        guest => guest.id !== id

    );


    saveGuestList(guests);


    renderGuestList();

}



/* ==========================================================
   RESET ALL DATA
========================================================== */

const resetButton =
    document.getElementById("resetData");


if (resetButton) {

    resetButton.addEventListener("click", () => {


        const confirmDelete =
            confirm(
                "Hapus semua data undangan?"
            );


        if (!confirmDelete) {

            return;

        }


        localStorage.removeItem(
            STORAGE_KEY
        );


        renderGuestList();


    });

}



/* ==========================================================
   DELETE BUTTON EVENT
========================================================== */

document.addEventListener(
    "click",
    function (e) {


        if (
            e.target.classList.contains(
                "delete-guest"
            )
        ) {


            const id =
                Number(
                    e.target.dataset.id
                );


            deleteGuest(id);


        }


    });