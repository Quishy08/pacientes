class SistemaHospital {
  constructor() {
    this.pacientes = JSON.parse(localStorage.getItem("pacientes") || "[]");
    this.contadorId = parseInt(localStorage.getItem("contadorId") || "1");
    this.graficos = {};
    this.inicializar();
  }

  inicializar() {
    this.configurarEventos();
    this.configurarDatosIniciales();
    $("#fechaIngreso").val(new Date().toISOString().split("T")[0]);
  }

  configurarEventos() {
    $(".pestaña-nav").click((e) => {
      const idPestaña = $(e.target).data("pestaña");
      this.cambiarPestaña(idPestaña);
    });

    $("#formPaciente").submit((e) => {
      e.preventDefault();
      this.registrarPaciente();
    });

    $("#buscarPaciente").on("input", (e) => {
      const termino = $(e.target).val().toLowerCase();
      this.buscarPacientes(termino);
    });
  }

  cambiarPestaña(idPestaña) {
    $(".pestaña-nav").removeClass("activo");
    $(".contenido-pestaña").removeClass("activo");

    $(`[data-pestaña="${idPestaña}"]`).addClass("activo");
    $(`#${idPestaña}`).addClass("activo");

    if (idPestaña === "lista") {
      this.mostrarListaPacientes();
    } else if (idPestaña === "estadisticas") {
      setTimeout(() => this.actualizarEstadisticas(), 100);
    }
  }

  registrarPaciente() {
    const paciente = {
      id: this.contadorId++,
      nombre: $("#nombre").val(),
      edad: parseInt($("#edad").val()),
      genero: $("#genero").val(),
      telefono: $("#telefono").val(),
      direccion: $("#direccion").val(),
      fechaIngreso: $("#fechaIngreso").val(),
      departamento: $("#departamento").val(),
      diagnostico: $("#diagnostico").val(),
      medico: $("#medico").val(),
      seguro: $("#seguro").val(),
      estado: "activo",
      fechaRegistro: new Date().toISOString(),
    };

    this.pacientes.push(paciente);
    this.guardarDatos();

    this.mostrarMensaje(
      `¡Paciente registrado exitosamente! ID: ${paciente.id}`,
      "success"
    );
    $("#formPaciente")[0].reset();
    $("#fechaIngreso").val(new Date().toISOString().split("T")[0]);
  }

  buscarPacientes(termino) {
    const pacientesFiltrados = this.pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(termino) ||
        p.id.toString().includes(termino) ||
        p.departamento.toLowerCase().includes(termino)
    );
    this.mostrarListaPacientes(pacientesFiltrados);
  }

  mostrarListaPacientes(lista = this.pacientes) {
    const contenedor = $("#listaPacientes");
    contenedor.empty();

    if (lista.length === 0) {
      contenedor.html(
        '<div class="alerta alerta-info">No se encontraron pacientes.</div>'
      );
      return;
    }

    lista.forEach((paciente) => {
      const etiquetaEstado =
        paciente.estado === "activo"
          ? '<span class="etiqueta-estado estado-activo">Activo</span>'
          : '<span class="etiqueta-estado estado-alta">Alta</span>';

      const diasHospitalizacion = this.calcularDiasHospitalizacion(
        paciente.fechaIngreso,
        paciente.fechaAlta
      );

      const tarjeta = `
                <div class="tarjeta-paciente">
                    <div class="header-paciente">
                        <div class="nombre-paciente">${paciente.nombre}</div>
                        <div class="id-paciente">ID: ${paciente.id}</div>
                    </div>
                    
                    <div class="info-paciente">
                        <div class="item-info">
                            <div class="etiqueta-info">Edad</div>
                            <div class="valor-info">${paciente.edad} años</div>
                        </div>
                        <div class="item-info">
                            <div class="etiqueta-info">Departamento</div>
                            <div class="valor-info">${
                              paciente.departamento
                            }</div>
                        </div>
                        <div class="item-info">
                            <div class="etiqueta-info">Médico</div>
                            <div class="valor-info">${
                              paciente.medico || "No asignado"
                            }</div>
                        </div>
                        <div class="item-info">
                            <div class="etiqueta-info">Días Hospitalizado</div>
                            <div class="valor-info">${diasHospitalizacion} días</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                        ${etiquetaEstado}
                        <div>
                            ${
                              paciente.estado === "activo"
                                ? `<button class="boton boton-exito" onclick="sistemaHospital.darAlta(${paciente.id})">📋 Dar Alta</button>`
                                : `<span style="color: #28a745; font-weight: 600;">Alta: ${this.formatearFecha(
                                    paciente.fechaAlta
                                  )}</span>`
                            }
                            <button class="boton boton-peligro" onclick="sistemaHospital.eliminarPaciente(${
                              paciente.id
                            })" style="margin-left: 10px;">🗑️ Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
      contenedor.append(tarjeta);
    });
  }

  actualizarEstadisticas() {
    const total = this.pacientes.length;
    const activos = this.pacientes.filter((p) => p.estado === "activo").length;
    const altasHoy = this.pacientes.filter((p) => {
      if (!p.fechaAlta) return false;
      const hoy = new Date().toISOString().split("T")[0];
      return p.fechaAlta === hoy;
    }).length;

    const promedioEstancia = this.calcularPromedioEstancia();

    $("#totalPacientes").text(total);
    $("#pacientesActivos").text(activos);
    $("#altasHoy").text(altasHoy);
    $("#promedioDias").text(promedioEstancia);

    this.crearGraficos();
  }

  crearGraficos() {
    this.crearGraficoDepartamentos();
    this.crearGraficoIngresos();
  }

  crearGraficoDepartamentos() {
    const lienzo = document.getElementById("graficoDepartamentos");
    if (!lienzo) return;

    if (this.graficos.departamentos) {
      this.graficos.departamentos.destroy();
    }

    const departamentos = {};
    this.pacientes.forEach((p) => {
      const dept = p.departamento || "Sin departamento";
      departamentos[dept] = (departamentos[dept] || 0) + 1;
    });

    if (Object.keys(departamentos).length === 0) {
      const ctx = lienzo.getContext("2d");
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.font = "16px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillStyle = "#6c757d";
      ctx.fillText(
        "No hay datos para mostrar",
        lienzo.width / 2,
        lienzo.height / 2
      );
      return;
    }

    this.graficos.departamentos = new Chart(lienzo, {
      type: "doughnut",
      data: {
        labels: Object.keys(departamentos).map(
          (dept) =>
            dept.charAt(0).toUpperCase() + dept.slice(1).replace("-", " ")
        ),
        datasets: [
          {
            data: Object.values(departamentos),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
              "#FF6B6B",
              "#4ECDC4",
            ],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  crearGraficoIngresos() {
    const lienzo = document.getElementById("graficoIngresos");
    if (!lienzo) return;

    if (this.graficos.ingresos) {
      this.graficos.ingresos.destroy();
    }

    const ingresosPorMes = {};
    this.pacientes.forEach((p) => {
      if (p.fechaIngreso) {
        const fecha = new Date(p.fechaIngreso);
        const mes = fecha.toLocaleDateString("es-ES", {
          month: "short",
          year: "numeric",
        });
        ingresosPorMes[mes] = (ingresosPorMes[mes] || 0) + 1;
      }
    });

    if (Object.keys(ingresosPorMes).length === 0) {
      const ctx = lienzo.getContext("2d");
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.font = "16px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillStyle = "#6c757d";
      ctx.fillText(
        "No hay datos para mostrar",
        lienzo.width / 2,
        lienzo.height / 2
      );
      return;
    }

    const mesesOrdenados = Object.keys(ingresosPorMes).sort((a, b) => {
      return new Date(a) - new Date(b);
    });

    this.graficos.ingresos = new Chart(lienzo, {
      type: "line",
      data: {
        labels: mesesOrdenados,
        datasets: [
          {
            label: "Número de Ingresos",
            data: mesesOrdenados.map((mes) => ingresosPorMes[mes]),
            borderColor: "#007bff",
            backgroundColor: "rgba(0, 123, 255, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  darAlta(id) {
    const paciente = this.pacientes.find((p) => p.id === id);
    if (paciente) {
      paciente.estado = "alta";
      paciente.fechaAlta = new Date().toISOString().split("T")[0];
      this.guardarDatos();
      this.mostrarListaPacientes();
      this.mostrarMensaje(
        `Alta médica registrada para ${paciente.nombre}`,
        "success"
      );
    }
  }

  eliminarPaciente(id) {
    if (confirm("¿Está seguro de que desea eliminar este paciente?")) {
      this.pacientes = this.pacientes.filter((p) => p.id !== id);
      this.guardarDatos();
      this.mostrarListaPacientes();
      this.mostrarMensaje("Paciente eliminado correctamente", "success");
    }
  }

  calcularDiasHospitalizacion(fechaIngreso, fechaAlta = null) {
    const ingreso = new Date(fechaIngreso);
    const fin = fechaAlta ? new Date(fechaAlta) : new Date();
    const diferencia = fin - ingreso;
    return Math.max(0, Math.ceil(diferencia / (1000 * 60 * 60 * 24)));
  }

  calcularPromedioEstancia() {
    if (this.pacientes.length === 0) return 0;

    const totalDias = this.pacientes.reduce((sum, p) => {
      return (
        sum + this.calcularDiasHospitalizacion(p.fechaIngreso, p.fechaAlta)
      );
    }, 0);

    return Math.round(totalDias / this.pacientes.length);
  }

  formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString("es-ES");
  }

  mostrarMensaje(mensaje, tipo) {
    const clase = tipo === "success" ? "alert-success" : "alert-error";
    const html = `<div class="alert ${clase}">${mensaje}</div>`;
    $("#mensajeRegistro").html(html);

    setTimeout(() => {
      $("#mensajeRegistro").empty();
    }, 5000);
  }

  guardarDatos() {
    localStorage.setItem("pacientes", JSON.stringify(this.pacientes));
    localStorage.setItem("contadorId", this.contadorId.toString());
  }

  configurarDatosIniciales() {
    if (this.pacientes.length === 0) {
      const ejemplos = [
        {
          id: 1,
          nombre: "María González López",
          edad: 45,
          genero: "femenino",
          telefono: "555-0123",
          direccion: "Av. Reforma 123, Ciudad de México",
          fechaIngreso: "2025-05-20",
          departamento: "cardiologia",
          diagnostico: "Hipertensión arterial - Control y seguimiento",
          medico: "Dr. Carlos Ramírez",
          seguro: "imss",
          estado: "activo",
          fechaRegistro: "2025-05-20T10:30:00.000Z",
        },
        {
          id: 2,
          nombre: "Juan Pérez Martínez",
          edad: 32,
          genero: "masculino",
          telefono: "555-0456",
          direccion: "Calle 5 de Mayo 456, Puebla",
          fechaIngreso: "2025-04-19",
          departamento: "emergencias",
          diagnostico: "Fractura de tibia - Requiere cirugía",
          medico: "Dra. Ana Herrera",
          seguro: "privado",
          estado: "activo",
          fechaRegistro: "2025-04-19T15:45:00.000Z",
        },
        {
          id: 3,
          nombre: "Sofía Mendoza García",
          edad: 28,
          genero: "femenino",
          telefono: "555-0789",
          direccion: "Col. Centro, Calle Juárez 789",
          fechaIngreso: "2025-05-18",
          departamento: "ginecologia",
          diagnostico: "Control prenatal - Embarazo de 32 semanas",
          medico: "Dr. Luis Morales",
          seguro: "issste",
          estado: "alta",
          fechaAlta: "2025-05-21",
          fechaRegistro: "2025-05-18T09:15:00.000Z",
        },
        {
          id: 4,
          nombre: "Roberto Silva Cruz",
          edad: 67,
          genero: "masculino",
          telefono: "555-0321",
          direccion: "Fraccionamiento Las Flores 321",
          fechaIngreso: "2025-05-17",
          departamento: "medicina-general",
          diagnostico: "Diabetes tipo 2 - Descompensación",
          medico: "Dra. Patricia López",
          seguro: "imss",
          estado: "activo",
          fechaRegistro: "2025-05-17T14:20:00.000Z",
        },
        {
          id: 5,
          nombre: "Elena Rodríguez Vega",
          edad: 55,
          genero: "femenino",
          telefono: "555-0654",
          direccion: "Av. Universidad 654, Puebla",
          fechaIngreso: "2025-05-16",
          departamento: "neurologia",
          diagnostico: "Migraña crónica - Tratamiento especializado",
          medico: "Dr. Fernando Castillo",
          seguro: "particular",
          estado: "activo",
          fechaRegistro: "2025-05-16T11:30:00.000Z",
        },
      ];

      this.pacientes = ejemplos;
      this.contadorId = 6;
      this.guardarDatos();
    }
  }
}

// Inicialización cuando el documento está listo
$(document).ready(function () {
  window.sistemaHospital = new SistemaHospital();

  $("#cerrarPublicidad").click(function () {
    $("#bannerPublicidad").slideUp();
  });

  $("#ventanaPublicidad").fadeIn(400, function () {
    setTimeout(function () {
      $("#ventanaPublicidad").fadeOut(400);
    }, 3000);
  });
});
