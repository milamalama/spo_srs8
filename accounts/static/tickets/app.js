const csrfToken = document.querySelector(
    "[name=csrfmiddlewaretoken]"
).value;

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
            ...(options.headers || {})
        },
        credentials: "same-origin"
    });

    let data = null;

    if (response.status !== 204) {
        data = await response.json().catch(() => null);
    }

    if (!response.ok) {
        throw new Error(
            JSON.stringify(data || {
                detail: "Ошибка выполнения запроса"
            })
        );
    }

    return data;
}
const categorySelect =
    document.getElementById("category");

const form =
    document.getElementById("ticket-form");

const titleInput =
    document.getElementById("title");

const message =
    document.getElementById("message");

function showMessage(text, isError = false) {
    message.textContent = text;
    message.className =
        "alert " + (isError ? "alert-danger" : "alert-success");
}

async function loadCategories() {
    const categories = await apiRequest(
        "/api/categories/"
    );

    categorySelect.replaceChildren();

    for (const category of categories) {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.append(option);
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        await apiRequest("/api/tickets/", {
            method: "POST",
            body: JSON.stringify({
                title: titleInput.value,
                category: Number(categorySelect.value)
            })
        });

        titleInput.value = "";
        showMessage("Заявка успешно создана");

        await loadTickets();
    } catch (error) {
        showMessage(
            "Не удалось создать заявку: " + getErrorText(error),
            true
        );
    }
});
const list = document.getElementById("tickets-list");
const loading = document.getElementById("loading");
const filter = document.getElementById("status-filter");

async function loadTickets() {
    loading.hidden = false;

    const params = new URLSearchParams();

    if (filter.value) {
        params.set("status", filter.value);
    }

    const query = params.toString();
    const url = "/api/tickets/" + (query ? "?" + query : "");

    const statusNames = {
        new: "Новая",
        progress: "В работе",
        done: "Выполнена"
    };

    try {
        const tickets = await apiRequest(url);
        list.replaceChildren();

        if (tickets.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "Заявки не найдены";
            list.append(empty);
            return;
        }

        for (const ticket of tickets) {
            const row = document.createElement("div");
            row.className =
                "d-flex flex-wrap align-items-center " +
                "justify-content-between border-bottom py-3 gap-3";

            const title = document.createElement("div");
            title.textContent =
                ticket.title + " — " + ticket.category_name;

            const status = document.createElement("span");
            status.className = "badge bg-blue-lt";
            status.textContent = statusNames[ticket.status];

            const actions = document.createElement("div");
            actions.className = "d-flex flex-wrap gap-2";

            const select = document.createElement("select");
            select.className = "form-select w-auto";
            select.setAttribute(
                "aria-label",
                "Новый статус заявки «" + ticket.title + "»"
            );

            const option = document.createElement("option");

            if (ticket.status === "new") {
                option.value = "progress";
                option.textContent = "В работе";
            } else if (ticket.status === "progress") {
                option.value = "done";
                option.textContent = "Выполнена";
            } else {
                option.value = "done";
                option.textContent = "Выполнена";
                select.disabled = true;
            }

            select.append(option);

            const changeButton = document.createElement("button");
            changeButton.type = "button";
            changeButton.className = "btn btn-primary";
            changeButton.textContent = "Изменить статус";
            changeButton.disabled = ticket.status === "done";

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "btn btn-danger";
            deleteButton.textContent = "Удалить";

            changeButton.addEventListener("click", async () => {
                changeButton.disabled = true;
                deleteButton.disabled = true;

                try {
                    await changeStatus(ticket.id, select.value);
                } finally {
                    changeButton.disabled = ticket.status === "done";
                    deleteButton.disabled = false;
                }
            });

            deleteButton.addEventListener("click", async () => {
                changeButton.disabled = true;
                deleteButton.disabled = true;

                try {
                    await deleteTicket(ticket.id, ticket.title);
                } finally {
                    changeButton.disabled = ticket.status === "done";
                    deleteButton.disabled = false;
                }
            });

            actions.append(select, changeButton, deleteButton);
            row.append(title, status, actions);
            list.append(row);
        }
    } catch (error) {
        showMessage(
            "Не удалось загрузить заявки: " + getErrorText(error),
            true
        );
    } finally {
        loading.hidden = true;
    }
}

filter.addEventListener("change", loadTickets);


function getErrorText(error) {
    try {
        const data = JSON.parse(error.message);
        const messages = [];

        for (const key in data) {
            const value = data[key];

            if (Array.isArray(value)) {
                messages.push(value.join(" "));
            } else {
                messages.push(String(value));
            }
        }

        return messages.join(" ");
    } catch {
        return error.message;
    }
}

async function changeStatus(ticketId, newStatus) {
    try {
        await apiRequest(`/api/tickets/${ticketId}/`, {
            method: "PATCH",
            body: JSON.stringify({
                status: newStatus
            })
        });
    } catch (error) {
        showMessage(
            "Не удалось изменить статус: " + getErrorText(error),
            true
        );
        return;
    }

    showMessage("Статус заявки изменён");
    await loadTickets();
}

async function deleteTicket(ticketId, ticketTitle) {
    const confirmed = confirm(
        `Удалить заявку «${ticketTitle}»?`
    );
    if (!confirmed) {
        return;
    }
    try {
        await apiRequest(`/api/tickets/${ticketId}/`, {
            method: "DELETE"
        });
    } catch (error) {
        showMessage(
            "Не удалось удалить заявку: " + getErrorText(error),
            true
        );
        return;
    }

    showMessage("Заявка удалена");
    await loadTickets();
}
async function initialize() {
    try {
        await loadCategories();
        await loadTickets();
    } catch (error) {
        showMessage(
            "Ошибка инициализации: " + error.message,
            true
        );
    }
}

initialize();