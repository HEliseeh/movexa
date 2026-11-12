package com.mycompany.myapp.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Ligne de l'historique d'un prospect (« A répondu au message », +15). */
@Getter
@Setter
@Entity
@Table(name = "prospect_event")
public class ProspectEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prospect_id", nullable = false)
    private Prospect prospect;

    @Column(name = "label", length = 200, nullable = false)
    private String label;

    /** Variation de la chance d'adhésion, en points (null = pas de variation). */
    @Column(name = "delta")
    private Integer delta;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;
}
