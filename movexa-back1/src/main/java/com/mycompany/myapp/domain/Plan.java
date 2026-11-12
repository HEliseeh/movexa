package com.mycompany.myapp.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import lombok.Getter;
import lombok.Setter;

/** Formule d'abonnement vendue par la salle (séance, semaine, mois…), prix en FCFA. */
@Getter
@Setter
@Entity
@Table(name = "plan")
public class Plan implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @NotNull
    @Min(0)
    @Column(name = "price", nullable = false)
    private Long price;

    /** Durée en jours ; 0 = valable le jour même (séance unique). */
    @NotNull
    @Min(0)
    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
