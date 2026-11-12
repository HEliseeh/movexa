package com.mycompany.myapp.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Journal d'exécution d'une tâche planifiée (sans donnée personnelle). */
@Getter
@Setter
@Entity
@Table(name = "job_run")
public class JobRun implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_name", length = 50, nullable = false)
    private String jobName;

    @Column(name = "ran_at", nullable = false)
    private Instant ranAt = Instant.now();

    @Column(name = "updated_count")
    private Integer updatedCount;

    @Column(name = "deleted_count")
    private Integer deletedCount;

    @Column(name = "details", length = 300)
    private String details;
}
