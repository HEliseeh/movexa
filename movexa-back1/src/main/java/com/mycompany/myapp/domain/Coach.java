package com.mycompany.myapp.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Coach de la salle : contact et disciplines enseignées. Les membres suivis pointent vers lui (member.coach_id). */
@Getter
@Setter
@Entity
@Table(name = "coach")
public class Coach implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(name = "first_name", length = 100, nullable = false)
    private String firstName;

    @Size(max = 100)
    @Column(name = "last_name", length = 100)
    private String lastName;

    @Size(max = 30)
    @Column(name = "phone", length = 30)
    private String phone;

    @Size(max = 150)
    @Column(name = "email", length = 150)
    private String email;

    @Size(max = 300)
    @Column(name = "notes", length = 300)
    private String notes;

    /** Désactivé = ne fait plus partie de l'équipe, mais l'historique reste lisible */
    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "coach_discipline", joinColumns = @JoinColumn(name = "coach_id"))
    @Column(name = "discipline", length = 60, nullable = false)
    private List<String> disciplines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    /** Nom affiché (et recopié dans member.coach) */
    public String getFullName() {
        return lastName == null || lastName.isBlank() ? firstName : firstName + " " + lastName;
    }
}
